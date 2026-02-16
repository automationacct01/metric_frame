"""Azure AI Foundry provider implementation.

Provides integration with Azure AI Foundry including:
- GPT-4o deployments
- GPT-4 Turbo deployments
- Custom model deployments
"""
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

from openai import AzureOpenAI, AuthenticationError as OpenAIAuthError, RateLimitError as OpenAIRateLimitError, APIError

from ..base_provider import (
    BaseAIProvider,
    ProviderType,
    AuthType,
    ProviderCredentials,
    AIResponse,
    ModelInfo,
    AuthenticationError,
    RateLimitError,
    ProviderTimeoutError,
    InvalidRequestError,
    ServerError,
)
from ..provider_registry import get_models_for_provider

logger = logging.getLogger(__name__)


class AzureOpenAIProvider(BaseAIProvider):
    """Azure AI Foundry AI provider.

    Implements the BaseAIProvider interface for Azure AI Foundry Service.
    Requires endpoint, deployment name, API version, and API key.
    """

    provider_type = ProviderType.AZURE
    auth_type = AuthType.AZURE
    supported_models = [
        "gpt-4o",  # Model availability depends on Azure deployment
    ]

    def __init__(self):
        super().__init__()
        self._client: Optional[AzureOpenAI] = None
        self._deployment_name: Optional[str] = None
        self._default_model = "gpt-4o"

    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the Azure AI Foundry client with credentials.

        Args:
            credentials: Must contain:
                - api_key
                - azure_endpoint
                - azure_deployment
                - azure_api_version (optional, defaults to 2024-10-21)

        Returns:
            True if initialization succeeded
        """
        if not credentials.api_key:
            logger.error("Azure AI Foundry initialization failed: No API key provided")
            return False

        if not credentials.azure_endpoint:
            logger.error("Azure AI Foundry initialization failed: No endpoint provided")
            return False

        if not credentials.azure_deployment:
            logger.error("Azure AI Foundry initialization failed: No deployment name provided")
            return False

        api_version = credentials.azure_api_version or "2024-10-21"

        try:
            self._client = AzureOpenAI(
                api_key=credentials.api_key,
                azure_endpoint=credentials.azure_endpoint,
                api_version=api_version,
            )
            self._deployment_name = credentials.azure_deployment
            self._credentials = credentials
            self._initialized = True
            logger.info(f"Azure AI Foundry provider initialized: endpoint={credentials.azure_endpoint}, deployment={credentials.azure_deployment}")
            return True
        except Exception as e:
            logger.error(f"Azure AI Foundry initialization failed: {e}")
            return False

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate Azure AI Foundry credentials by making a minimal API call.

        Args:
            credentials: Credentials to validate

        Returns:
            True if credentials are valid
        """
        if not credentials.api_key or not credentials.azure_endpoint or not credentials.azure_deployment:
            return False

        api_version = credentials.azure_api_version or "2024-10-21"

        try:
            test_client = AzureOpenAI(
                api_key=credentials.api_key,
                azure_endpoint=credentials.azure_endpoint,
                api_version=api_version,
            )
            # Make a minimal API call to validate
            await asyncio.to_thread(
                lambda: test_client.chat.completions.create(
                    model=credentials.azure_deployment,
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=10,
                )
            )
            return True
        except OpenAIAuthError:
            logger.warning("Azure AI Foundry credential validation failed: Invalid credentials")
            return False
        except Exception as e:
            logger.error(f"Azure AI Foundry credential validation error: {e}")
            return False

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        model: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate a response using Azure AI Foundry.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model ID (ignored - uses deployment name from credentials)
            max_tokens: Maximum response tokens
            temperature: Sampling temperature
            system_prompt: Optional system prompt
            **kwargs: Additional parameters (ignored)

        Returns:
            AIResponse with generated content
        """
        if not self._client or not self._deployment_name:
            raise InvalidRequestError("Provider not initialized", ProviderType.AZURE)

        # Build messages with system prompt
        api_messages = []
        if system_prompt:
            api_messages.append({"role": "system", "content": system_prompt})

        # Add conversation messages
        for msg in messages:
            if system_prompt and msg["role"] == "system":
                continue
            api_messages.append(msg)

        start_time = time.time()

        try:
            response = await asyncio.to_thread(
                lambda: self._client.chat.completions.create(
                    model=self._deployment_name,  # Use deployment name, not model
                    messages=api_messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            )

            latency_ms = (time.time() - start_time) * 1000

            return AIResponse(
                content=response.choices[0].message.content,
                model_used=self._deployment_name,
                provider=self.provider_type,
                tokens_used={
                    "input": response.usage.prompt_tokens,
                    "output": response.usage.completion_tokens,
                },
                latency_ms=latency_ms,
                finish_reason=response.choices[0].finish_reason,
                raw_response=response,
            )

        except OpenAIAuthError as e:
            raise AuthenticationError(str(e), ProviderType.AZURE)
        except OpenAIRateLimitError as e:
            raise RateLimitError(str(e), ProviderType.AZURE)
        except asyncio.TimeoutError as e:
            raise ProviderTimeoutError(str(e), ProviderType.AZURE)
        except APIError as e:
            if e.status_code and e.status_code >= 500:
                raise ServerError(str(e), ProviderType.AZURE)
            raise InvalidRequestError(str(e), ProviderType.AZURE)
        except Exception as e:
            logger.error(f"Azure AI Foundry API error: {e}")
            raise ServerError(str(e), ProviderType.AZURE)

    def get_available_models(self) -> List[ModelInfo]:
        """Get available Azure AI Foundry models.

        Note: Actual model availability depends on Azure deployment configuration.

        Returns:
            List of ModelInfo objects
        """
        return get_models_for_provider(ProviderType.AZURE)
