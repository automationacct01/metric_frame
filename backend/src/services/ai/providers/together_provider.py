"""Together.ai provider implementation.

Provides integration with Together.ai's open source models including:
- Llama 3.3 70B
- Llama 3.1 405B
- Mixtral 8x22B
- Qwen 2.5 72B
"""
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

from together import Together
from together.error import AuthenticationError as TogetherAuthError, RateLimitError as TogetherRateLimitError

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


class TogetherProvider(BaseAIProvider):
    """Together.ai AI provider.

    Implements the BaseAIProvider interface for Together.ai's models.
    Uses OpenAI-compatible API format.
    """

    provider_type = ProviderType.TOGETHER
    auth_type = AuthType.API_KEY
    supported_models = [
        "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
        "mistralai/Mixtral-8x22B-Instruct-v0.1",
        "Qwen/Qwen2.5-72B-Instruct-Turbo",
    ]

    def __init__(self):
        super().__init__()
        self._client: Optional[Together] = None
        self._default_model = "meta-llama/Llama-3.3-70B-Instruct-Turbo"

    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the Together client with credentials.

        Args:
            credentials: Must contain api_key

        Returns:
            True if initialization succeeded
        """
        if not credentials.api_key:
            logger.error("Together initialization failed: No API key provided")
            return False

        try:
            self._client = Together(api_key=credentials.api_key)
            self._credentials = credentials
            self._initialized = True
            logger.info("Together.ai provider initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Together initialization failed: {e}")
            return False

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate Together API key by making a minimal API call.

        Args:
            credentials: Credentials to validate

        Returns:
            True if credentials are valid
        """
        if not credentials.api_key:
            return False

        try:
            test_client = Together(api_key=credentials.api_key)
            # Make a minimal API call to validate
            await asyncio.to_thread(
                lambda: test_client.chat.completions.create(
                    model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=10,
                )
            )
            return True
        except TogetherAuthError:
            logger.warning("Together credential validation failed: Invalid API key")
            return False
        except Exception as e:
            logger.error(f"Together credential validation error: {e}")
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
        """Generate a response using Together.ai.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model ID to use
            max_tokens: Maximum response tokens
            temperature: Sampling temperature
            system_prompt: Optional system prompt
            **kwargs: Additional parameters (ignored)

        Returns:
            AIResponse with generated content
        """
        if not self._client:
            raise InvalidRequestError("Provider not initialized", ProviderType.TOGETHER)

        # Validate model
        if not self.supports_model(model):
            logger.warning(f"Model {model} not in supported list, using anyway")

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
                    model=model,
                    messages=api_messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            )

            latency_ms = (time.time() - start_time) * 1000

            return AIResponse(
                content=response.choices[0].message.content,
                model_used=model,
                provider=self.provider_type,
                tokens_used={
                    "input": response.usage.prompt_tokens if response.usage else 0,
                    "output": response.usage.completion_tokens if response.usage else 0,
                },
                latency_ms=latency_ms,
                finish_reason=response.choices[0].finish_reason if response.choices else None,
                raw_response=response,
            )

        except TogetherAuthError as e:
            raise AuthenticationError(str(e), ProviderType.TOGETHER)
        except TogetherRateLimitError as e:
            raise RateLimitError(str(e), ProviderType.TOGETHER)
        except asyncio.TimeoutError as e:
            raise ProviderTimeoutError(str(e), ProviderType.TOGETHER)
        except Exception as e:
            logger.error(f"Together API error: {e}")
            raise ServerError(str(e), ProviderType.TOGETHER)

    def get_available_models(self) -> List[ModelInfo]:
        """Get available Together.ai models.

        Returns:
            List of ModelInfo objects
        """
        return get_models_for_provider(ProviderType.TOGETHER)
