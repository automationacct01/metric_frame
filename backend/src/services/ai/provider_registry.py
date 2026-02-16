"""Provider registry with metadata about available AI providers.

This module contains static information about each provider including
authentication requirements, available models, and display metadata.

Reference: ai_models_documentation.md (Last Updated: January 24, 2026)
"""
from typing import Any, Dict, List

from .base_provider import ProviderType, AuthType, ModelInfo


# Provider metadata registry
PROVIDER_REGISTRY: Dict[ProviderType, Dict[str, Any]] = {
    ProviderType.ANTHROPIC: {
        "code": "anthropic",
        "name": "Anthropic Claude",
        "description": "Claude AI models from Anthropic - advanced reasoning and coding capabilities",
        "auth_type": AuthType.API_KEY,
        "auth_fields": [
            {"name": "api_key", "label": "API Key", "type": "password", "required": True, "placeholder": "sk-ant-api03-..."}
        ],
        "models": [
            ModelInfo(
                model_id="claude-opus-4-5-20251101",
                display_name="Claude Opus 4.5",
                description="Premium intelligence model for complex tasks",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="claude-sonnet-4-5-20250929",
                display_name="Claude Sonnet 4.5",
                description="Best balance of intelligence and speed",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="claude-haiku-4-5-20251001",
                display_name="Claude Haiku 4.5",
                description="Fastest model, near-frontier intelligence",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
        ],
        "default_model": "claude-sonnet-4-5-20250929",
    },

    ProviderType.OPENAI: {
        "code": "openai",
        "name": "OpenAI",
        "description": "GPT models from OpenAI - versatile general-purpose AI",
        "auth_type": AuthType.API_KEY,
        "auth_fields": [
            {"name": "api_key", "label": "API Key", "type": "password", "required": True, "placeholder": "sk-..."}
        ],
        "models": [
            ModelInfo(
                model_id="gpt-5.2-2025-12-11",
                display_name="GPT-5.2",
                description="Best for coding and agentic tasks",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5.2-codex-2026-01-14",
                display_name="GPT-5.2 Codex",
                description="Optimized for Codex CLI",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5.1-2025-11-13",
                display_name="GPT-5.1",
                description="Reasoning model",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5-2025-08-07",
                display_name="GPT-5",
                description="Flagship reasoning model",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5-mini-2025-08-07",
                display_name="GPT-5 Mini",
                description="Faster GPT-5 variant",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5-pro-2025-10-06",
                display_name="GPT-5 Pro",
                description="Extended reasoning",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
        ],
        "default_model": "gpt-5.2-2025-12-11",
    },

    ProviderType.TOGETHER: {
        "code": "together",
        "name": "Together.ai",
        "description": "Open source models including DeepSeek, Qwen, Llama, and Mistral",
        "auth_type": AuthType.API_KEY,
        "auth_fields": [
            {"name": "api_key", "label": "API Key", "type": "password", "required": True, "placeholder": "..."}
        ],
        "models": [
            ModelInfo(
                model_id="deepseek-ai/DeepSeek-V3.1",
                display_name="DeepSeek-V3.1",
                description="Advanced reasoning model",
                context_window=128000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="deepseek-ai/DeepSeek-R1",
                display_name="DeepSeek-R1",
                description="Complex reasoning model",
                context_window=163000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
                display_name="Qwen3-Coder 480B",
                description="Best for coding tasks",
                context_window=256000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="Qwen/Qwen3-235B-A22B-Thinking-2507",
                display_name="Qwen3 235B Thinking",
                description="Advanced thinking model",
                context_window=262000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
                display_name="Llama 4 Maverick",
                description="Latest Llama model, 1M context",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="meta-llama/Llama-4-Scout-17B-16E-Instruct",
                display_name="Llama 4 Scout",
                description="Fast Llama model, 1M context",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                display_name="Llama 3.3 70B Turbo",
                description="Fast general-purpose model",
                context_window=131000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="mistralai/Mistral-Small-24B-Instruct-2501",
                display_name="Mistral Small 3",
                description="Efficient Mistral model",
                context_window=32000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
        ],
        "default_model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    },

    ProviderType.AZURE: {
        "code": "azure",
        "name": "Azure AI Foundry",
        "description": "Enterprise AI models hosted on Microsoft Azure AI Foundry",
        "auth_type": AuthType.AZURE,
        "auth_fields": [
            {"name": "azure_endpoint", "label": "Endpoint URL", "type": "text", "required": True, "placeholder": "https://your-resource.services.ai.azure.com"},
            {"name": "azure_deployment", "label": "Deployment Name", "type": "text", "required": True, "placeholder": "gpt-5.2"},
            {"name": "azure_api_version", "label": "API Version", "type": "text", "required": True, "placeholder": "2025-12-11", "default": "2025-12-11"},
            {"name": "api_key", "label": "API Key", "type": "password", "required": True, "placeholder": "..."},
        ],
        "models": [
            ModelInfo(
                model_id="gpt-5.2",
                display_name="GPT-5.2",
                description="Best for coding and agentic tasks",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5.2-codex",
                display_name="GPT-5.2 Codex",
                description="Optimized for Codex CLI",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5.1",
                display_name="GPT-5.1",
                description="Reasoning model",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5",
                display_name="GPT-5",
                description="Flagship reasoning model",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5-mini",
                display_name="GPT-5 Mini",
                description="Faster GPT-5 variant",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gpt-5-pro",
                display_name="GPT-5 Pro",
                description="Extended reasoning",
                context_window=400000,
                max_output_tokens=128000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="DeepSeek-R1",
                display_name="DeepSeek-R1",
                description="Complex reasoning model",
                context_window=163000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="Llama-4-Maverick-17B-128E-Instruct-FP8",
                display_name="Llama 4 Maverick",
                description="Latest Llama model",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="Mistral-Large-3",
                display_name="Mistral Large 3",
                description="Large Mistral model",
                context_window=128000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
        ],
        "default_model": "gpt-5.2",
        "note": "Model availability depends on your Azure deployment configuration",
    },

    ProviderType.BEDROCK: {
        "code": "bedrock",
        "name": "AWS Bedrock",
        "description": "Foundation models on AWS including Claude, Nova, Llama, and more",
        "auth_type": AuthType.AWS_IAM,
        "auth_fields": [
            {"name": "aws_access_key", "label": "Access Key ID", "type": "text", "required": True, "placeholder": "AKIA..."},
            {"name": "aws_secret_key", "label": "Secret Access Key", "type": "password", "required": True, "placeholder": "..."},
            {"name": "aws_region", "label": "Region", "type": "select", "required": True, "default": "us-east-1", "options": [
                "us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-northeast-1", "ap-southeast-1"
            ]},
        ],
        "models": [
            # Claude 4.5 on Bedrock
            ModelInfo(
                model_id="anthropic.claude-opus-4-5-20251101-v1:0",
                display_name="Claude Opus 4.5 (Bedrock)",
                description="Premium intelligence model",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="anthropic.claude-sonnet-4-5-20250929-v1:0",
                display_name="Claude Sonnet 4.5 (Bedrock)",
                description="Best balance of intelligence and speed",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="anthropic.claude-haiku-4-5-20251001-v1:0",
                display_name="Claude Haiku 4.5 (Bedrock)",
                description="Fastest Claude model",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            # Amazon Nova
            ModelInfo(
                model_id="amazon.nova-premier-v1:0",
                display_name="Amazon Nova Premier",
                description="Text, image, and video model",
                context_window=300000,
                max_output_tokens=8192,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="amazon.nova-pro-v1:0",
                display_name="Amazon Nova Pro",
                description="Balanced Nova model",
                context_window=300000,
                max_output_tokens=8192,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="amazon.nova-lite-v1:0",
                display_name="Amazon Nova Lite",
                description="Fast Nova model",
                context_window=300000,
                max_output_tokens=8192,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="amazon.nova-micro-v1:0",
                display_name="Amazon Nova Micro",
                description="Text-only efficient model",
                context_window=128000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            # Llama 4 on Bedrock
            ModelInfo(
                model_id="meta.llama4-maverick-17b-instruct-v1:0",
                display_name="Llama 4 Maverick (Bedrock)",
                description="Latest Llama model",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="meta.llama4-scout-17b-instruct-v1:0",
                display_name="Llama 4 Scout (Bedrock)",
                description="Fast Llama model",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            # Other models
            ModelInfo(
                model_id="mistral.mistral-large-3-675b-instruct",
                display_name="Mistral Large 3 (Bedrock)",
                description="Large Mistral model",
                context_window=128000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="deepseek.r1-v1:0",
                display_name="DeepSeek-R1 (Bedrock)",
                description="Complex reasoning model",
                context_window=163000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="qwen.qwen3-235b-a22b-2507-v1:0",
                display_name="Qwen3 235B (Bedrock)",
                description="Advanced thinking model",
                context_window=262000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
        ],
        "default_model": "anthropic.claude-sonnet-4-5-20250929-v1:0",
    },

    ProviderType.VERTEX: {
        "code": "vertex",
        "name": "GCP Vertex AI",
        "description": "Google's AI platform with Gemini and partner models",
        "auth_type": AuthType.GCP,
        "auth_fields": [
            {"name": "gcp_project", "label": "Project ID", "type": "text", "required": True, "placeholder": "my-project-123"},
            {"name": "gcp_location", "label": "Location", "type": "select", "required": True, "default": "us-central1", "options": [
                "us-central1", "us-east1", "us-west1", "europe-west1", "europe-west4", "asia-northeast1"
            ]},
            {"name": "gcp_credentials_json", "label": "Service Account JSON", "type": "textarea", "required": True, "placeholder": '{"type": "service_account", ...}'},
        ],
        "models": [
            # Gemini Family
            ModelInfo(
                model_id="gemini-3-pro",
                display_name="Gemini 3 Pro (Preview)",
                description="Latest reasoning model, 1M context",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gemini-3-flash",
                display_name="Gemini 3 Flash (Preview)",
                description="Best multimodal and coding",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gemini-2.5-pro",
                display_name="Gemini 2.5 Pro",
                description="Complex reasoning, 1M context",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="gemini-2.5-flash",
                display_name="Gemini 2.5 Flash",
                description="Fast, controllable thinking",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=True,
                supports_function_calling=True,
            ),
            # Claude on Vertex
            ModelInfo(
                model_id="claude-opus-4-5@20251101",
                display_name="Claude Opus 4.5 (Vertex)",
                description="Premium intelligence via Vertex",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="claude-sonnet-4-5@20250929",
                display_name="Claude Sonnet 4.5 (Vertex)",
                description="Balanced Claude via Vertex",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="claude-haiku-4-5@20251001",
                display_name="Claude Haiku 4.5 (Vertex)",
                description="Fast Claude via Vertex",
                context_window=200000,
                max_output_tokens=64000,
                supports_vision=True,
                supports_function_calling=True,
            ),
            # Partner models
            ModelInfo(
                model_id="llama4-maverick",
                display_name="Llama 4 Maverick (Vertex)",
                description="Latest Llama model",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="llama4-scout",
                display_name="Llama 4 Scout (Vertex)",
                description="Fast Llama model",
                context_window=1000000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="mistral-medium-3",
                display_name="Mistral Medium 3 (Vertex)",
                description="Mistral model via Vertex",
                context_window=128000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
            ModelInfo(
                model_id="deepseek-r1-0528",
                display_name="DeepSeek-R1 (Vertex)",
                description="Complex reasoning model",
                context_window=163000,
                max_output_tokens=8192,
                supports_vision=False,
                supports_function_calling=True,
            ),
        ],
        "default_model": "gemini-2.5-pro",
    },

    ProviderType.LOCAL: {
        "code": "local",
        "name": "Local Models",
        "description": "Connect to locally hosted models via Ollama, LM Studio, vLLM, or similar. Run Llama, DeepSeek, Mistral, Qwen, and more on your own hardware. No API key or billing required.",
        "auth_type": AuthType.LOCAL_ENDPOINT,
        "auth_fields": [
            {"name": "local_endpoint", "label": "Endpoint URL", "type": "text", "required": True, "placeholder": "http://localhost:11434/v1"},
            {"name": "api_key", "label": "API Key (optional)", "type": "password", "required": False, "placeholder": "Optional — only if your endpoint requires authentication"},
        ],
        "models": [],  # Models are discovered dynamically from the endpoint
        "default_model": None,
        "dynamic_models": True,
        "note": "Models are discovered automatically from your local endpoint. No billing required. In Docker, use http://host.docker.internal:11434/v1 to reach the host machine.",
    },
}


def get_provider_info(provider_type: ProviderType) -> Dict[str, Any]:
    """Get metadata for a specific provider.

    Args:
        provider_type: The provider to get info for

    Returns:
        Dictionary with provider metadata
    """
    return PROVIDER_REGISTRY.get(provider_type, {})


def get_all_providers() -> List[Dict[str, Any]]:
    """Get metadata for all providers.

    Returns:
        List of provider metadata dictionaries
    """
    return [
        {**info, "provider_type": ptype.value}
        for ptype, info in PROVIDER_REGISTRY.items()
    ]


def get_models_for_provider(provider_type: ProviderType) -> List[ModelInfo]:
    """Get available models for a provider.

    Args:
        provider_type: The provider to get models for

    Returns:
        List of ModelInfo objects
    """
    info = PROVIDER_REGISTRY.get(provider_type, {})
    return info.get("models", [])
