"""API endpoints for Stripe payment integration.

Handles checkout sessions, webhooks, subscription management, and product setup.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Subscription, SubscriptionStatus
from ..schemas import (
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    SubscriptionResponse,
    SubscriptionStatusResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Plan configuration
PLAN_CONFIG = {
    "standard": {
        "name": "Standard",
        "description": "Full platform access with all AI and framework features.",
        "price_cents": 3000,  # $30.00
        "interval": "month",
    },
    "professional": {
        "name": "Professional",
        "description": "Everything in Standard, with custom changes tailored to your organization.",
        "price_cents": 20000,  # $200.00
        "interval": "month",
    },
}


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionCreate,
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout Session for subscription.

    Takes a plan name (standard/professional) and optional customer email,
    creates a Stripe Checkout Session in subscription mode, and returns the checkout URL.
    """
    plan_key = request.plan.lower()
    if plan_key not in PLAN_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan: {request.plan}. Must be 'standard' or 'professional'.",
        )

    if not stripe.api_key:
        raise HTTPException(
            status_code=500,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.",
        )

    plan = PLAN_CONFIG[plan_key]

    try:
        # Build the frontend base URL for success/cancel redirects
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5175")

        # Build checkout session params
        session_params = {
            "payment_method_types": ["card"],
            "mode": "subscription",
            "line_items": [
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"MetricFrame {plan['name']}",
                            "description": plan["description"],
                        },
                        "unit_amount": plan["price_cents"],
                        "recurring": {
                            "interval": plan["interval"],
                        },
                    },
                    "quantity": 1,
                }
            ],
            "success_url": f"{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{frontend_url}/checkout/cancel",
            "metadata": {
                "plan_name": plan_key,
            },
        }

        # Add customer email if provided
        if request.customer_email:
            session_params["customer_email"] = request.customer_email

        checkout_session = stripe.checkout.Session.create(**session_params)

        logger.info(
            "Created checkout session %s for plan %s",
            checkout_session.id,
            plan_key,
        )

        return CheckoutSessionResponse(
            checkout_url=checkout_session.url,
            session_id=checkout_session.id,
        )

    except stripe.error.StripeError as e:
        logger.error("Stripe error creating checkout session: %s", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating checkout session: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create checkout session.")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events.

    Processes events:
    - checkout.session.completed: Creates new subscription record
    - customer.subscription.updated: Updates subscription status
    - customer.subscription.deleted: Marks subscription as canceled
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature header.")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload.")
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature.")

    event_type = event["type"]
    data_object = event["data"]["object"]

    logger.info("Received Stripe webhook event: %s", event_type)

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(data_object, db)
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(data_object, db)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(data_object, db)
        else:
            logger.info("Unhandled event type: %s", event_type)
    except Exception as e:
        logger.error("Error processing webhook event %s: %s", event_type, str(e))
        # Return 200 anyway to prevent Stripe from retrying
        # Log the error for investigation

    return JSONResponse(content={"status": "ok"}, status_code=200)


async def _handle_checkout_completed(session: dict, db: Session):
    """Handle checkout.session.completed event.

    Creates or updates a Subscription record when a customer completes checkout.
    """
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")
    customer_email = session.get("customer_email") or session.get("customer_details", {}).get("email", "")
    plan_name = session.get("metadata", {}).get("plan_name", "standard")
    checkout_session_id = session.get("id")

    if not subscription_id:
        logger.warning("No subscription ID in checkout session %s", checkout_session_id)
        return

    # Check if subscription already exists
    existing = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == subscription_id)
        .first()
    )

    if existing:
        existing.status = SubscriptionStatus.ACTIVE
        existing.stripe_checkout_session_id = checkout_session_id
        existing.customer_email = customer_email or existing.customer_email
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("Updated existing subscription %s", subscription_id)
        return

    # Retrieve subscription details from Stripe
    try:
        stripe_sub = stripe.Subscription.retrieve(subscription_id)
        period_start = datetime.fromtimestamp(stripe_sub.current_period_start, tz=timezone.utc)
        period_end = datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc)
    except Exception as e:
        logger.error("Error retrieving subscription %s: %s", subscription_id, str(e))
        period_start = datetime.now(timezone.utc)
        period_end = None

    new_subscription = Subscription(
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        stripe_checkout_session_id=checkout_session_id,
        customer_email=customer_email,
        plan_name=plan_name,
        status=SubscriptionStatus.ACTIVE,
        current_period_start=period_start,
        current_period_end=period_end,
        cancel_at_period_end=False,
    )

    db.add(new_subscription)
    db.commit()
    logger.info("Created subscription %s for %s", subscription_id, customer_email)


async def _handle_subscription_updated(subscription_data: dict, db: Session):
    """Handle customer.subscription.updated event.

    Updates subscription status, period dates, and cancellation info.
    """
    subscription_id = subscription_data.get("id")

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == subscription_id)
        .first()
    )

    if not sub:
        logger.warning("Subscription %s not found for update", subscription_id)
        return

    # Map Stripe status to our enum
    stripe_status = subscription_data.get("status", "active")
    status_map = {
        "active": SubscriptionStatus.ACTIVE,
        "past_due": SubscriptionStatus.PAST_DUE,
        "canceled": SubscriptionStatus.CANCELED,
        "incomplete": SubscriptionStatus.INCOMPLETE,
        "trialing": SubscriptionStatus.TRIALING,
    }
    sub.status = status_map.get(stripe_status, SubscriptionStatus.ACTIVE)

    # Update period dates
    if subscription_data.get("current_period_start"):
        sub.current_period_start = datetime.fromtimestamp(
            subscription_data["current_period_start"], tz=timezone.utc
        )
    if subscription_data.get("current_period_end"):
        sub.current_period_end = datetime.fromtimestamp(
            subscription_data["current_period_end"], tz=timezone.utc
        )

    sub.cancel_at_period_end = subscription_data.get("cancel_at_period_end", False)

    if subscription_data.get("canceled_at"):
        sub.canceled_at = datetime.fromtimestamp(
            subscription_data["canceled_at"], tz=timezone.utc
        )

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Updated subscription %s to status %s", subscription_id, sub.status.value)


async def _handle_subscription_deleted(subscription_data: dict, db: Session):
    """Handle customer.subscription.deleted event.

    Marks the subscription as canceled.
    """
    subscription_id = subscription_data.get("id")

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == subscription_id)
        .first()
    )

    if not sub:
        logger.warning("Subscription %s not found for deletion", subscription_id)
        return

    sub.status = SubscriptionStatus.CANCELED
    sub.canceled_at = datetime.now(timezone.utc)
    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Canceled subscription %s", subscription_id)


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    email: str = Query(..., description="Customer email to look up subscription"),
    db: Session = Depends(get_db),
):
    """Get subscription status by customer email.

    Returns the most recent active subscription for the given email address.
    """
    sub = (
        db.query(Subscription)
        .filter(Subscription.customer_email == email)
        .order_by(Subscription.created_at.desc())
        .first()
    )

    if not sub:
        return SubscriptionStatusResponse(
            has_subscription=False,
            status=None,
            plan_name=None,
            current_period_end=None,
            cancel_at_period_end=False,
        )

    return SubscriptionStatusResponse(
        has_subscription=True,
        status=sub.status.value,
        plan_name=sub.plan_name,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
    )


@router.post("/create-products")
async def create_stripe_products():
    """One-time setup endpoint to create Stripe Products and Prices programmatically.

    Creates Standard ($30/month) and Professional ($200/month) subscription products.
    Returns the created product and price IDs for reference.
    """
    if not stripe.api_key:
        raise HTTPException(
            status_code=500,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.",
        )

    created = {}

    try:
        for plan_key, plan in PLAN_CONFIG.items():
            # Create product
            product = stripe.Product.create(
                name=f"MetricFrame {plan['name']}",
                description=plan["description"],
                metadata={"plan_key": plan_key},
            )

            # Create price
            price = stripe.Price.create(
                product=product.id,
                unit_amount=plan["price_cents"],
                currency="usd",
                recurring={"interval": plan["interval"]},
            )

            created[plan_key] = {
                "product_id": product.id,
                "price_id": price.id,
                "amount": plan["price_cents"],
                "interval": plan["interval"],
            }

            logger.info(
                "Created Stripe product %s (price: %s) for plan %s",
                product.id,
                price.id,
                plan_key,
            )

        return {
            "message": "Stripe products and prices created successfully",
            "products": created,
        }

    except stripe.error.StripeError as e:
        logger.error("Stripe error creating products: %s", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating products: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create Stripe products.")
