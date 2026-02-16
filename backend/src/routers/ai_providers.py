"""AI Provider management router.

Endpoints for managing AI provider configurations, credentials, and status.
"""
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AIProvider, AIModel, UserAIConfiguration, User
from .auth import get_current_user
from ..schemas import (
    AIProviderSchema,
    AIProviderListResponse,
    AIModelSchema,
    AuthFieldSchema,
    AIConfigurationCreate,
    AIConfigurationUpdate,
    AIConfigurationResponse,
    AIConfigurationListResponse,
    AICredentialValidationResponse,
    AIProviderStatusResponse,
    AuthType,
)
from ..services.ai import (
    get_provider,
    get_available_providers,
    ProviderType,
    ProviderCredentials,
    is_provider_available,
)
from ..services.ai.utils.encryption import CredentialEncryption
from ..services.ai.provider_registry import PROVIDER_REGISTRY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-providers", tags=["ai-providers"])


# ==============================================================================
# Helper Functions
# ==============================================================================

def _provider_type_from_code(code: str) -> Optional[ProviderType]:
    """Convert provider code string to ProviderType enum."""
    try:
        return ProviderType(code)
    except ValueError:
        return None


def _credentials_from_schema(creds: dict, provider_type: ProviderType) -> ProviderCredentials:
    """Convert credentials dict to ProviderCredentials."""
    return ProviderCredentials(
        api_key=creds.get("api_key"),
        azure_endpoint=creds.get("azure_endpoint"),
        azure_deployment=creds.get("azure_deployment"),
        azure_api_version=creds.get("azure_api_version"),
        aws_access_key=creds.get("aws_access_key"),
        aws_secret_key=creds.get("aws_secret_key"),
        aws_region=creds.get("aws_region"),
        gcp_project=creds.get("gcp_project"),
        gcp_location=creds.get("gcp_location"),
        gcp_credentials_json=creds.get("gcp_credentials_json"),
        local_endpoint=creds.get("local_endpoint"),
    )


def _build_provider_response(provider_info: dict) -> AIProviderSchema:
    """Build AIProviderSchema from provider registry info."""
    auth_fields = []
    for field in provider_info.get("auth_fields", []):
        auth_fields.append(AuthFieldSchema(
            name=field["name"],
            label=field["label"],
            type=field["type"],
            required=field.get("required", True),
            placeholder=field.get("placeholder"),
            default=field.get("default"),
            options=field.get("options"),
        ))

    models = []
    for model in provider_info.get("models", []):
        models.append(AIModelSchema(
            model_id=model.model_id,
            display_name=model.display_name,
            description=model.description,
            context_window=model.context_window,
            max_output_tokens=model.max_output_tokens,
            supports_vision=model.supports_vision,
            supports_function_calling=model.supports_function_calling,
        ))

    return AIProviderSchema(
        code=provider_info["code"],
        name=provider_info["name"],
        description=provider_info.get("description"),
        auth_type=AuthType(provider_info["auth_type"].value),
        auth_fields=auth_fields,
        models=models,
        default_model=provider_info.get("default_model"),
        available=provider_info.get("available", True),
        unavailable_reason=provider_info.get("unavailable_reason"),
        dynamic_models=provider_info.get("dynamic_models", False),
        note=provider_info.get("note"),
    )


# ==============================================================================
# Provider Discovery Endpoints
# ==============================================================================

@router.get("/", response_model=AIProviderListResponse)
async def list_providers(
    db: Session = Depends(get_db),
):
    """List all available AI providers with their models and auth requirements.

    Returns provider metadata including:
    - Authentication type and required fields
    - Available models with capabilities
    - Whether the provider implementation is available
    """
    providers = get_available_providers()
    provider_schemas = [_build_provider_response(p) for p in providers]

    return AIProviderListResponse(
        providers=provider_schemas,
        total=len(provider_schemas),
    )


# ==============================================================================
# User Configuration Endpoints
# NOTE: These must be defined BEFORE /{provider_code} routes to avoid matching
# "configurations" as a provider_code path parameter.
# ==============================================================================

@router.get("/configurations", response_model=AIConfigurationListResponse)
async def list_user_configurations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all AI provider configurations for the current user."""
    user_id = current_user.id

    configs = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.user_id == user_id
    ).all()

    # Get active config
    user = db.query(User).filter(User.id == user_id).first()
    active_config_id = user.active_ai_config_id if user else None

    config_responses = []
    for config in configs:
        provider = db.query(AIProvider).filter(AIProvider.id == config.provider_id).first()
        config_responses.append(AIConfigurationResponse(
            id=config.id,
            user_id=config.user_id,
            provider_code=provider.code if provider else "unknown",
            provider_name=provider.name if provider else "Unknown",
            is_active=config.is_active,
            model_id=config.model_id,
            max_tokens=config.max_tokens or 4096,
            temperature=float(config.temperature) if config.temperature else 0.7,
            credentials_validated=config.credentials_validated,
            last_validated_at=config.last_validated_at,
            validation_error=config.validation_error,
            created_at=config.created_at,
            updated_at=config.updated_at,
        ))

    return AIConfigurationListResponse(
        configurations=config_responses,
        active_configuration_id=active_config_id,
        total=len(config_responses),
    )


@router.post("/configurations", response_model=AIConfigurationResponse, status_code=status.HTTP_201_CREATED)
async def create_configuration(
    config: AIConfigurationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI provider configuration for the current user.

    Credentials are encrypted before storage.
    """
    user_id = current_user.id

    # Validate provider exists
    provider_type = _provider_type_from_code(config.provider_code)
    if not provider_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider: {config.provider_code}",
        )

    # Get or create provider in DB
    provider = db.query(AIProvider).filter(AIProvider.code == config.provider_code).first()
    if not provider:
        # Create provider from registry
        provider_info = PROVIDER_REGISTRY.get(provider_type, {})
        provider = AIProvider(
            code=config.provider_code,
            name=provider_info.get("name", config.provider_code),
            description=provider_info.get("description"),
            auth_type=provider_info.get("auth_type", "api_key").value if hasattr(provider_info.get("auth_type"), 'value') else str(provider_info.get("auth_type", "api_key")),
            auth_fields=[f.__dict__ if hasattr(f, '__dict__') else f for f in provider_info.get("auth_fields", [])],
            active=True,
        )
        db.add(provider)
        db.flush()

    # Check for existing config
    existing = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.user_id == user_id,
        UserAIConfiguration.provider_id == provider.id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Configuration for provider '{config.provider_code}' already exists. Use PUT to update.",
        )

    # Encrypt credentials
    encryption = CredentialEncryption()
    if not encryption.is_available:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Credential encryption not configured. Set AI_CREDENTIALS_MASTER_KEY environment variable.",
        )
    creds_dict = config.credentials.model_dump(exclude_none=True)
    encrypted_creds = encryption.encrypt_credentials(creds_dict)

    # Create configuration
    db_config = UserAIConfiguration(
        user_id=user_id,
        provider_id=provider.id,
        model_id=config.model_id,
        encrypted_credentials=encrypted_creds,
        max_tokens=config.max_tokens,
        temperature=config.temperature,
        is_active=False,
        credentials_validated=False,
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)

    return AIConfigurationResponse(
        id=db_config.id,
        user_id=db_config.user_id,
        provider_code=provider.code,
        provider_name=provider.name,
        is_active=db_config.is_active,
        model_id=db_config.model_id,
        max_tokens=db_config.max_tokens or 4096,
        temperature=float(db_config.temperature) if db_config.temperature else 0.7,
        credentials_validated=db_config.credentials_validated,
        last_validated_at=db_config.last_validated_at,
        validation_error=db_config.validation_error,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at,
    )


@router.put("/configurations/{config_id}", response_model=AIConfigurationResponse)
async def update_configuration(
    config_id: UUID,
    update: AIConfigurationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing AI provider configuration."""
    user_id = current_user.id

    db_config = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.id == config_id,
        UserAIConfiguration.user_id == user_id,
    ).first()

    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found",
        )

    provider = db.query(AIProvider).filter(AIProvider.id == db_config.provider_id).first()

    # Update fields
    if update.model_id is not None:
        db_config.model_id = update.model_id
    if update.max_tokens is not None:
        db_config.max_tokens = update.max_tokens
    if update.temperature is not None:
        db_config.temperature = update.temperature

    # Update credentials if provided
    if update.credentials:
        encryption = CredentialEncryption()
        if not encryption.is_available:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Credential encryption not configured. Set AI_CREDENTIALS_MASTER_KEY environment variable.",
            )
        creds_dict = update.credentials.model_dump(exclude_none=True)
        if not creds_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one credential field is required.",
            )
        db_config.encrypted_credentials = encryption.encrypt_credentials(creds_dict)
        db_config.credentials_validated = False  # Require re-validation
        db_config.validation_error = None

    db_config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_config)

    return AIConfigurationResponse(
        id=db_config.id,
        user_id=db_config.user_id,
        provider_code=provider.code if provider else "unknown",
        provider_name=provider.name if provider else "Unknown",
        is_active=db_config.is_active,
        model_id=db_config.model_id,
        max_tokens=db_config.max_tokens or 4096,
        temperature=float(db_config.temperature) if db_config.temperature else 0.7,
        credentials_validated=db_config.credentials_validated,
        last_validated_at=db_config.last_validated_at,
        validation_error=db_config.validation_error,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at,
    )


@router.delete("/configurations/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_configuration(
    config_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an AI provider configuration."""
    user_id = current_user.id

    db_config = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.id == config_id,
        UserAIConfiguration.user_id == user_id,
    ).first()

    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found",
        )

    # If this was the active config, clear it from user
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.active_ai_config_id == config_id:
        user.active_ai_config_id = None

    db.delete(db_config)
    db.commit()


# ==============================================================================
# Validation and Activation Endpoints
# ==============================================================================

@router.post("/configurations/{config_id}/validate", response_model=AICredentialValidationResponse)
async def validate_configuration(
    config_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Test that credentials are valid by making a minimal API call."""
    user_id = current_user.id

    db_config = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.id == config_id,
        UserAIConfiguration.user_id == user_id,
    ).first()

    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found",
        )

    provider = db.query(AIProvider).filter(AIProvider.id == db_config.provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found",
        )

    provider_type = _provider_type_from_code(provider.code)
    if not provider_type or not is_provider_available(provider_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider '{provider.code}' is not available",
        )

    # Decrypt credentials
    if not db_config.encrypted_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No credentials configured",
        )

    encryption = CredentialEncryption()
    if not encryption.is_available:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption not configured. Set AI_CREDENTIALS_MASTER_KEY environment variable.",
        )

    try:
        creds_dict = encryption.decrypt_credentials(db_config.encrypted_credentials)
        credentials = _credentials_from_schema(creds_dict, provider_type)
    except Exception as e:
        logger.error(f"Failed to decrypt credentials for config {config_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt credentials",
        )

    # Validate with provider
    try:
        provider_instance = get_provider(provider_type)
        valid = await provider_instance.validate_credentials(credentials)
    except Exception as e:
        logger.error(f"Credential validation failed for config {config_id}: {type(e).__name__}")
        valid = False

    # Update validation status
    now = datetime.utcnow()
    db_config.credentials_validated = valid
    db_config.last_validated_at = now
    db_config.validation_error = None if valid else "Credential validation failed"
    db.commit()

    return AICredentialValidationResponse(
        valid=valid,
        error=None if valid else "Credential validation failed",
        validated_at=now,
    )


@router.post("/configurations/{config_id}/activate", response_model=AIConfigurationResponse)
async def activate_configuration(
    config_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set this configuration as the active one for the current user."""
    user_id = current_user.id

    db_config = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.id == config_id,
        UserAIConfiguration.user_id == user_id,
    ).first()

    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found",
        )

    provider = db.query(AIProvider).filter(AIProvider.id == db_config.provider_id).first()

    # Warn if not validated
    if not db_config.credentials_validated:
        logger.warning(f"Activating unvalidated configuration {config_id}")

    # Deactivate all other configs for this user
    db.query(UserAIConfiguration).filter(
        UserAIConfiguration.user_id == user_id,
        UserAIConfiguration.id != config_id,
    ).update({"is_active": False})

    # Activate this config
    db_config.is_active = True

    # Update user's active config reference
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.active_ai_config_id = config_id

    db.commit()
    db.refresh(db_config)

    return AIConfigurationResponse(
        id=db_config.id,
        user_id=db_config.user_id,
        provider_code=provider.code if provider else "unknown",
        provider_name=provider.name if provider else "Unknown",
        is_active=db_config.is_active,
        model_id=db_config.model_id,
        max_tokens=db_config.max_tokens or 4096,
        temperature=float(db_config.temperature) if db_config.temperature else 0.7,
        credentials_validated=db_config.credentials_validated,
        last_validated_at=db_config.last_validated_at,
        validation_error=db_config.validation_error,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at,
    )


@router.post("/configurations/{config_id}/deactivate", response_model=AIConfigurationResponse)
async def deactivate_configuration(
    config_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate this configuration."""
    user_id = current_user.id

    db_config = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.id == config_id,
        UserAIConfiguration.user_id == user_id,
    ).first()

    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found",
        )

    provider = db.query(AIProvider).filter(AIProvider.id == db_config.provider_id).first()

    db_config.is_active = False

    # Clear user's active config if this was it
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.active_ai_config_id == config_id:
        user.active_ai_config_id = None

    db.commit()
    db.refresh(db_config)

    return AIConfigurationResponse(
        id=db_config.id,
        user_id=db_config.user_id,
        provider_code=provider.code if provider else "unknown",
        provider_name=provider.name if provider else "Unknown",
        is_active=db_config.is_active,
        model_id=db_config.model_id,
        max_tokens=db_config.max_tokens or 4096,
        temperature=float(db_config.temperature) if db_config.temperature else 0.7,
        credentials_validated=db_config.credentials_validated,
        last_validated_at=db_config.last_validated_at,
        validation_error=db_config.validation_error,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at,
    )


# ==============================================================================
# Dynamic Provider Endpoints
# NOTE: These must be defined AFTER /configurations routes because {provider_code}
# would otherwise match "configurations" as a path parameter.
# ==============================================================================

@router.get("/{provider_code}/discover-models", response_model=List[AIModelSchema])
async def discover_provider_models(
    provider_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Discover models from a dynamic provider endpoint (e.g., local models).

    Queries the provider's model listing API to find available models.
    Requires the provider to be configured first.
    """
    provider_type = _provider_type_from_code(provider_code)
    if not provider_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider_code}' not found",
        )

    # Get user's configuration for this provider
    provider_db = db.query(AIProvider).filter(AIProvider.code == provider_code).first()
    if not provider_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider_code}' not configured in database",
        )

    user_config = db.query(UserAIConfiguration).filter(
        UserAIConfiguration.user_id == current_user.id,
        UserAIConfiguration.provider_id == provider_db.id,
    ).first()

    if not user_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider not configured. Save your endpoint URL first.",
        )

    # Decrypt credentials and initialize provider
    encryption = CredentialEncryption()
    if not encryption.is_available:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption not configured",
        )

    try:
        creds_dict = encryption.decrypt_credentials(user_config.encrypted_credentials)
        credentials = _credentials_from_schema(creds_dict, provider_type)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt credentials",
        )

    # Initialize provider and discover models
    provider_instance = get_provider(provider_type)
    initialized = await provider_instance.initialize(credentials)
    if not initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to the local model endpoint. Is the server running?",
        )

    if hasattr(provider_instance, 'discover_models'):
        models = await provider_instance.discover_models()
    else:
        models = provider_instance.get_available_models()

    return [
        AIModelSchema(
            model_id=m.model_id,
            display_name=m.display_name,
            description=m.description,
            context_window=m.context_window,
            max_output_tokens=m.max_output_tokens,
            supports_vision=m.supports_vision,
            supports_function_calling=m.supports_function_calling,
        )
        for m in models
    ]


@router.get("/{provider_code}", response_model=AIProviderSchema)
async def get_provider_info(
    provider_code: str,
    db: Session = Depends(get_db),
):
    """Get detailed information about a specific provider."""
    provider_type = _provider_type_from_code(provider_code)
    if not provider_type or provider_type not in PROVIDER_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider_code}' not found",
        )

    provider_info = PROVIDER_REGISTRY[provider_type]
    provider_info["available"] = is_provider_available(provider_type)
    return _build_provider_response({
        **provider_info,
        "code": provider_code,
    })


@router.get("/{provider_code}/models", response_model=List[AIModelSchema])
async def list_provider_models(
    provider_code: str,
    db: Session = Depends(get_db),
):
    """List available models for a specific provider."""
    provider_type = _provider_type_from_code(provider_code)
    if not provider_type or provider_type not in PROVIDER_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider_code}' not found",
        )

    provider_info = PROVIDER_REGISTRY[provider_type]
    models = []
    for model in provider_info.get("models", []):
        models.append(AIModelSchema(
            model_id=model.model_id,
            display_name=model.display_name,
            description=model.description,
            context_window=model.context_window,
            max_output_tokens=model.max_output_tokens,
            supports_vision=model.supports_vision,
            supports_function_calling=model.supports_function_calling,
        ))

    return models
