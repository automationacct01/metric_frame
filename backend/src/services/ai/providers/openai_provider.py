"""OpenAI GPT provider implementation.

Provides integration with OpenAI's models including:
- GPT-4o
- GPT-4o Mini
- GPT-4 Turbo
- o1 and o1-mini (reasoning models)
"""
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

from openai import OpenAI, AuthenticationError as OpenAIAuthError, RateLimitError as OpenAIRateLimitError, APIError

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


class OpenAIProvider(BaseAIProvider):
    """OpenAI GPT AI provider.

    Implements the BaseAIProvider interface for OpenAI's models.
    """

    provider_type = ProviderType.OPENAI
    auth_type = AuthType.API_KEY
    supported_models = [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "o1",
        "o1-mini",
    ]

    def __init__(self):
        super().__init__()
        self._client: Optional[OpenAI] = None
        self._default_model = "gpt-4o"

    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the OpenAI client with credentials.

        Args:
            credentials: Must contain api_key

        Returns:
            True if initialization succeeded
        """
        if not credentials.api_key:
            logger.error("OpenAI initialization failed: No API key provided")
            return False

        try:
            self._client = OpenAI(api_key=credentials.api_key)
            self._credentials = credentials
            self._initialized = True
            logger.info("OpenAI provider initialized successfully")
            return True
        except Exception as e:
            logger.error(f"OpenAI initialization failed: {e}")
            return False

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate OpenAI API key by making a minimal API call.

        Args:
            credentials: Credentials to validate

        Returns:
            True if credentials are valid
        """
        if not credentials.api_key:
            return False

        try:
            test_client = OpenAI(api_key=credentials.api_key)
            # Make a minimal API call to validate
            await asyncio.to_thread(
                lambda: test_client.chat.completions.create(
                    model="gpt-4o-mini",  # Use cheapest model for validation
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=10,
                )
            )
            return True
        except OpenAIAuthError:
            logger.warning("OpenAI credential validation failed: Invalid API key")
            return False
        except Exception as e:
            logger.error(f"OpenAI credential validation error: {e}")
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
        """Generate a response using OpenAI.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model ID to use
            max_tokens: Maximum response tokens
            temperature: Sampling temperature
            system_prompt: Optional system prompt (prepended to messages)
            **kwargs: Additional parameters (ignored)

        Returns:
            AIResponse with generated content
        """
        if not self._client:
            raise InvalidRequestError("Provider not initialized", ProviderType.OPENAI)

        # Validate model
        if not self.supports_model(model):
            logger.warning(f"Model {model} not in supported list, using anyway")

        # Build messages with system prompt
        api_messages = []
        if system_prompt:
            api_messages.append({"role": "system", "content": system_prompt})

        # Add conversation messages (filter out any existing system messages if we provided one)
        for msg in messages:
            if system_prompt and msg["role"] == "system":
                continue
            api_messages.append(msg)

        start_time = time.time()

        try:
            # o1 models have different parameter requirements
            if model.startswith("o1"):
                # o1 models don't support temperature or system messages in the same way
                response = await asyncio.to_thread(
                    lambda: self._client.chat.completions.create(
                        model=model,
                        messages=api_messages,
                        max_completion_tokens=max_tokens,
                    )
                )
            else:
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
                    "input": response.usage.prompt_tokens,
                    "output": response.usage.completion_tokens,
                },
                latency_ms=latency_ms,
                finish_reason=response.choices[0].finish_reason,
                raw_response=response,
            )

        except OpenAIAuthError as e:
            raise AuthenticationError(str(e), ProviderType.OPENAI)
        except OpenAIRateLimitError as e:
            raise RateLimitError(str(e), ProviderType.OPENAI)
        except asyncio.TimeoutError as e:
            raise ProviderTimeoutError(str(e), ProviderType.OPENAI)
        except APIError as e:
            if e.status_code and e.status_code >= 500:
                raise ServerError(str(e), ProviderType.OPENAI)
            raise InvalidRequestError(str(e), ProviderType.OPENAI)
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise ServerError(str(e), ProviderType.OPENAI)

    def get_available_models(self) -> List[ModelInfo]:
        """Get available OpenAI models.

        Returns:
            List of ModelInfo objects
        """
        return get_models_for_provider(ProviderType.OPENAI)
