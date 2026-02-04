"""Seed script for loading AI provider and model definitions.

This script populates the ai_providers and ai_models tables with
the available AI providers and their supported models.

Usage:
    python -m src.seeds.load_ai_providers           # Load AI provider data
    python -m src.seeds.load_ai_providers --clear   # Clear and reload
"""

import argparse
from uuid import uuid4
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import AIProvider, AIModel


# Provider definitions
AI_PROVIDERS = [
    {
        "code": "anthropic",
        "name": "Anthropic Claude",
        "description": "Anthropic's Claude AI models including Opus 4.5, Sonnet 4.5, and Claude 3.x series",
        "auth_type": "api_key",
        "auth_fields": {
            "fields": [
                {
                    "name": "api_key",
                    "label": "API Key",
                    "type": "password",
                    "required": True,
                    "placeholder": "sk-ant-...",
                    "help_text": "Get your API key from console.anthropic.com"
                }
            ]
        },
        "active": True,
    },
    {
        "code": "openai",
        "name": "OpenAI",
        "description": "OpenAI's GPT models including GPT-4o, GPT-4 Turbo, and o1 reasoning models",
        "auth_type": "api_key",
        "auth_fields": {
            "fields": [
                {
                    "name": "api_key",
                    "label": "API Key",
                    "type": "password",
                    "required": True,
                    "placeholder": "sk-...",
                    "help_text": "Get your API key from platform.openai.com"
                }
            ]
        },
        "active": True,
    },
    {
        "code": "together",
        "name": "Together.ai",
        "description": "Together.ai's hosted open-source models including Llama, Mistral, and Qwen",
        "auth_type": "api_key",
        "auth_fields": {
            "fields": [
                {
                    "name": "api_key",
                    "label": "API Key",
                    "type": "password",
                    "required": True,
                    "placeholder": "...",
                    "help_text": "Get your API key from api.together.xyz"
                }
            ]
        },
        "active": True,
    },
    {
        "code": "azure",
        "name": "Azure OpenAI",
        "description": "Microsoft Azure-hosted OpenAI models with enterprise security and compliance",
        "auth_type": "azure",
        "auth_fields": {
            "fields": [
                {
                    "name": "azure_endpoint",
                    "label": "Azure Endpoint",
                    "type": "text",
                    "required": True,
                    "placeholder": "https://your-resource.openai.azure.com/",
                    "help_text": "Your Azure OpenAI resource endpoint URL"
                },
                {
                    "name": "azure_deployment",
                    "label": "Deployment Name",
                    "type": "text",
                    "required": True,
                    "placeholder": "gpt-4o-deployment",
                    "help_text": "The name of your Azure deployment"
                },
                {
                    "name": "api_key",
                    "label": "API Key",
                    "type": "password",
                    "required": True,
                    "placeholder": "...",
                    "help_text": "Your Azure OpenAI API key"
                },
                {
                    "name": "azure_api_version",
                    "label": "API Version",
                    "type": "text",
                    "required": False,
                    "default": "2024-02-15-preview",
                    "help_text": "Azure OpenAI API version"
                }
            ]
        },
        "active": True,
    },
    {
        "code": "bedrock",
        "name": "AWS Bedrock",
        "description": "Amazon Web Services Bedrock with Claude, Llama, Titan, and Nova models",
        "auth_type": "aws_iam",
        "auth_fields": {
            "fields": [
                {
                    "name": "aws_access_key",
                    "label": "AWS Access Key ID",
                    "type": "text",
                    "required": True,
                    "placeholder": "AKIA...",
                    "help_text": "Your AWS access key ID"
                },
                {
                    "name": "aws_secret_key",
                    "label": "AWS Secret Access Key",
                    "type": "password",
                    "required": True,
                    "placeholder": "...",
                    "help_text": "Your AWS secret access key"
                },
                {
                    "name": "aws_region",
                    "label": "AWS Region",
                    "type": "select",
                    "required": True,
                    "default": "us-east-1",
                    "options": [
                        "us-east-1", "us-west-2", "eu-west-1", "eu-central-1",
                        "ap-southeast-1", "ap-northeast-1"
                    ],
                    "help_text": "AWS region for Bedrock"
                },
                {
                    "name": "aws_session_token",
                    "label": "Session Token (Optional)",
                    "type": "password",
                    "required": False,
                    "help_text": "Required only for temporary credentials"
                }
            ]
        },
        "active": True,
    },
    {
        "code": "vertex",
        "name": "GCP Vertex AI",
        "description": "Google Cloud Vertex AI with Gemini models and Claude via Model Garden",
        "auth_type": "gcp",
        "auth_fields": {
            "fields": [
                {
                    "name": "gcp_project",
                    "label": "GCP Project ID",
                    "type": "text",
                    "required": True,
                    "placeholder": "my-project-123",
                    "help_text": "Your Google Cloud project ID"
                },
                {
                    "name": "gcp_location",
                    "label": "Location",
                    "type": "select",
                    "required": True,
                    "default": "us-central1",
                    "options": [
                        "us-central1", "us-east1", "us-west1", "europe-west1",
                        "asia-northeast1", "asia-southeast1"
                    ],
                    "help_text": "GCP region for Vertex AI"
                },
                {
                    "name": "gcp_credentials_json",
                    "label": "Service Account JSON",
                    "type": "textarea",
                    "required": False,
                    "placeholder": '{"type": "service_account", ...}',
                    "help_text": "Service account JSON key (leave empty to use ADC)"
                }
            ]
        },
        "active": True,
    },
]


# Model definitions by provider
AI_MODELS = {
    "anthropic": [
        {
            "model_id": "claude-opus-4-5-20251101",
            "display_name": "Claude Opus 4.5",
            "context_window": 200000,
            "max_output_tokens": 32000,
            "supports_vision": True,
            "cost_per_1k_input": 0.015,
            "cost_per_1k_output": 0.075,
            "active": True,
        },
        {
            "model_id": "claude-sonnet-4-5-20250929",
            "display_name": "Claude Sonnet 4.5",
            "context_window": 200000,
            "max_output_tokens": 16000,
            "supports_vision": True,
            "cost_per_1k_input": 0.003,
            "cost_per_1k_output": 0.015,
            "active": True,
        },
        {
            "model_id": "claude-3-5-sonnet-20241022",
            "display_name": "Claude 3.5 Sonnet",
            "context_window": 200000,
            "max_output_tokens": 8192,
            "supports_vision": True,
            "cost_per_1k_input": 0.003,
            "cost_per_1k_output": 0.015,
            "active": True,
        },
        {
            "model_id": "claude-3-haiku-20240307",
            "display_name": "Claude 3 Haiku",
            "context_window": 200000,
            "max_output_tokens": 4096,
            "supports_vision": True,
            "cost_per_1k_input": 0.00025,
            "cost_per_1k_output": 0.00125,
            "active": True,
        },
    ],
    "openai": [
        {
            "model_id": "gpt-4o",
            "display_name": "GPT-4o",
            "context_window": 128000,
            "max_output_tokens": 16384,
            "supports_vision": True,
            "cost_per_1k_input": 0.005,
            "cost_per_1k_output": 0.015,
            "active": True,
        },
        {
            "model_id": "gpt-4o-mini",
            "display_name": "GPT-4o Mini",
            "context_window": 128000,
            "max_output_tokens": 16384,
            "supports_vision": True,
            "cost_per_1k_input": 0.00015,
            "cost_per_1k_output": 0.0006,
            "active": True,
        },
        {
            "model_id": "gpt-4-turbo",
            "display_name": "GPT-4 Turbo",
            "context_window": 128000,
            "max_output_tokens": 4096,
            "supports_vision": True,
            "cost_per_1k_input": 0.01,
            "cost_per_1k_output": 0.03,
            "active": True,
        },
        {
            "model_id": "o1",
            "display_name": "o1 (Reasoning)",
            "context_window": 200000,
            "max_output_tokens": 100000,
            "supports_vision": True,
            "cost_per_1k_input": 0.015,
            "cost_per_1k_output": 0.06,
            "active": True,
        },
        {
            "model_id": "o1-mini",
            "display_name": "o1 Mini (Reasoning)",
            "context_window": 128000,
            "max_output_tokens": 65536,
            "supports_vision": False,
            "cost_per_1k_input": 0.003,
            "cost_per_1k_output": 0.012,
            "active": True,
        },
    ],
    "together": [
        {
            "model_id": "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
            "display_name": "Llama 3.1 405B Instruct Turbo",
            "context_window": 130000,
            "max_output_tokens": 4096,
            "supports_vision": False,
            "cost_per_1k_input": 0.005,
            "cost_per_1k_output": 0.005,
            "active": True,
        },
        {
            "model_id": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
            "display_name": "Llama 3.1 70B Instruct Turbo",
            "context_window": 130000,
            "max_output_tokens": 4096,
            "supports_vision": False,
            "cost_per_1k_input": 0.00088,
            "cost_per_1k_output": 0.00088,
            "active": True,
        },
        {
            "model_id": "mistralai/Mixtral-8x22B-Instruct-v0.1",
            "display_name": "Mixtral 8x22B Instruct",
            "context_window": 65536,
            "max_output_tokens": 4096,
            "supports_vision": False,
            "cost_per_1k_input": 0.0012,
            "cost_per_1k_output": 0.0012,
            "active": True,
        },
        {
            "model_id": "Qwen/Qwen2.5-72B-Instruct-Turbo",
            "display_name": "Qwen 2.5 72B Instruct Turbo",
            "context_window": 32768,
            "max_output_tokens": 4096,
            "supports_vision": False,
            "cost_per_1k_input": 0.0012,
            "cost_per_1k_output": 0.0012,
            "active": True,
        },
    ],
    "azure": [
        {
            "model_id": "gpt-4o",
            "display_name": "GPT-4o (Azure)",
            "context_window": 128000,
            "max_output_tokens": 16384,
            "supports_vision": True,
            "cost_per_1k_input": 0.005,
            "cost_per_1k_output": 0.015,
            "active": True,
        },
        {
            "model_id": "gpt-4o-mini",
            "display_name": "GPT-4o Mini (Azure)",
            "context_window": 128000,
            "max_output_tokens": 16384,
            "supports_vision": True,
            "cost_per_1k_input": 0.00015,
            "cost_per_1k_output": 0.0006,
            "active": True,
        },
    ],
    "bedrock": [
        {
            "model_id": "anthropic.claude-3-5-sonnet-20241022-v2:0",
            "display_name": "Claude 3.5 Sonnet v2 (Bedrock)",
            "context_window": 200000,
            "max_output_tokens": 8192,
            "supports_vision": True,
            "cost_per_1k_input": 0.003,
            "cost_per_1k_output": 0.015,
            "active": True,
        },
        {
            "model_id": "anthropic.claude-3-5-haiku-20241022-v1:0",
            "display_name": "Claude 3.5 Haiku (Bedrock)",
            "context_window": 200000,
            "max_output_tokens": 8192,
            "supports_vision": True,
            "cost_per_1k_input": 0.0008,
            "cost_per_1k_output": 0.004,
            "active": True,
        },
        {
            "model_id": "meta.llama3-2-90b-instruct-v1:0",
            "display_name": "Llama 3.2 90B Instruct (Bedrock)",
            "context_window": 128000,
            "max_output_tokens": 4096,
            "supports_vision": True,
            "cost_per_1k_input": 0.002,
            "cost_per_1k_output": 0.002,
            "active": True,
        },
        {
            "model_id": "amazon.titan-text-premier-v1:0",
            "display_name": "Amazon Titan Text Premier",
            "context_window": 32000,
            "max_output_tokens": 8192,
            "supports_vision": False,
            "cost_per_1k_input": 0.0005,
            "cost_per_1k_output": 0.0015,
            "active": True,
        },
    ],
    "vertex": [
        {
            "model_id": "gemini-2.0-flash-exp",
            "display_name": "Gemini 2.0 Flash (Experimental)",
            "context_window": 1000000,
            "max_output_tokens": 8192,
            "supports_vision": True,
            "cost_per_1k_input": 0.00,
            "cost_per_1k_output": 0.00,
            "active": True,
        },
        {
            "model_id": "gemini-1.5-pro",
            "display_name": "Gemini 1.5 Pro",
            "context_window": 2000000,
            "max_output_tokens": 8192,
            "supports_vision": True,
            "cost_per_1k_input": 0.00125,
            "cost_per_1k_output": 0.005,
            "active": True,
        },
        {
            "model_id": "gemini-1.5-flash",
            "display_name": "Gemini 1.5 Flash",
            "context_window": 1000000,
            "max_output_tokens": 8192,
            "supports_vision": True,
            "cost_per_1k_input": 0.000075,
            "cost_per_1k_output": 0.0003,
            "active": True,
        },
        {
            "model_id": "claude-3-5-sonnet-v2@20241022",
            "display_name": "Claude 3.5 Sonnet v2 (Model Garden)",
            "context_window": 200000,
            "max_output_tokens": 8192,
            "supports_vision": True,
            "cost_per_1k_input": 0.003,
            "cost_per_1k_output": 0.015,
            "active": True,
        },
    ],
}


def clear_ai_providers(db: Session) -> None:
    """Clear all AI provider and model data."""
    print("Clearing AI models...")
    db.query(AIModel).delete()
    print("Clearing AI providers...")
    db.query(AIProvider).delete()
    db.commit()
    print("AI provider data cleared.")


def load_ai_providers(db: Session) -> dict:
    """Load AI provider and model seed data.

    Args:
        db: Database session

    Returns:
        Dictionary with counts of loaded providers and models
    """
    providers_loaded = 0
    models_loaded = 0

    for provider_data in AI_PROVIDERS:
        # Check if provider already exists
        existing = db.query(AIProvider).filter(
            AIProvider.code == provider_data["code"]
        ).first()

        if existing:
            print(f"  Provider '{provider_data['code']}' already exists, skipping...")
            provider = existing
        else:
            provider = AIProvider(
                id=uuid4(),
                code=provider_data["code"],
                name=provider_data["name"],
                description=provider_data["description"],
                auth_type=provider_data["auth_type"],
                auth_fields=provider_data["auth_fields"],
                active=provider_data["active"],
            )
            db.add(provider)
            db.flush()  # Get the ID
            providers_loaded += 1
            print(f"  Loaded provider: {provider_data['name']}")

        # Load models for this provider
        provider_models = AI_MODELS.get(provider_data["code"], [])
        for model_data in provider_models:
            # Check if model already exists
            existing_model = db.query(AIModel).filter(
                AIModel.provider_id == provider.id,
                AIModel.model_id == model_data["model_id"]
            ).first()

            if existing_model:
                continue

            model = AIModel(
                id=uuid4(),
                provider_id=provider.id,
                model_id=model_data["model_id"],
                display_name=model_data["display_name"],
                context_window=model_data.get("context_window"),
                max_output_tokens=model_data.get("max_output_tokens"),
                supports_vision=model_data.get("supports_vision", False),
                active=model_data.get("active", True),
            )
            db.add(model)
            models_loaded += 1

        print(f"    Loaded {len(provider_models)} models for {provider_data['name']}")

    db.commit()

    return {
        "providers_loaded": providers_loaded,
        "models_loaded": models_loaded,
    }


def get_ai_provider_summary(db: Session) -> dict:
    """Get summary of AI providers in database."""
    providers = db.query(AIProvider).all()
    summary = {
        "total_providers": len(providers),
        "total_models": db.query(AIModel).count(),
        "providers": [],
    }

    for provider in providers:
        model_count = db.query(AIModel).filter(
            AIModel.provider_id == provider.id
        ).count()
        summary["providers"].append({
            "code": provider.code,
            "name": provider.name,
            "model_count": model_count,
            "active": provider.active,
        })

    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Load AI provider seed data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing AI provider data before loading",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print summary of AI providers in database",
    )
    args = parser.parse_args()

    db = SessionLocal()

    try:
        if args.summary:
            summary = get_ai_provider_summary(db)
            print("\n" + "=" * 50)
            print("AI PROVIDER SUMMARY")
            print("=" * 50)
            print(f"Total Providers: {summary['total_providers']}")
            print(f"Total Models: {summary['total_models']}")
            print("\nBy Provider:")
            for p in summary["providers"]:
                status = "Active" if p["active"] else "Inactive"
                print(f"  {p['name']}: {p['model_count']} models ({status})")
            return

        if args.clear:
            print("\n" + "=" * 50)
            print("Clearing AI provider data...")
            print("=" * 50)
            clear_ai_providers(db)

        print("\n" + "=" * 50)
        print("Loading AI provider data...")
        print("=" * 50)
        result = load_ai_providers(db)

        print("\n" + "=" * 50)
        print("LOAD COMPLETE!")
        print("=" * 50)
        print(f"Providers loaded: {result['providers_loaded']}")
        print(f"Models loaded: {result['models_loaded']}")

    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
