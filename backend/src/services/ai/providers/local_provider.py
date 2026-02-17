"""Local/OpenAI-compatible provider implementation.

Supports any server that exposes OpenAI-compatible endpoints:
- Ollama (http://localhost:11434/v1)
- LM Studio (http://localhost:1234/v1)
- vLLM (http://localhost:8000/v1)
- LocalAI (http://localhost:8080/v1)
- text-generation-webui (http://localhost:5000/v1)

Uses the OpenAI Python SDK with a custom base_url to communicate
with any OpenAI-compatible local model server.
"""
import asyncio
import ipaddress
import logging
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from openai import OpenAI, APIError, APIConnectionError, APITimeoutError


# Cloud metadata and link-local IP ranges that must be blocked to prevent SSRF
BLOCKED_IP_RANGES = [
    ipaddress.ip_network("169.254.0.0/16"),      # AWS/Azure metadata (link-local)
    ipaddress.ip_network("fd00:ec2::/32"),        # AWS IMDSv2 IPv6
    ipaddress.ip_network("100.100.100.0/24"),     # Alibaba Cloud metadata
]


def _validate_local_endpoint(url: str) -> str:
    """Validate a local AI provider endpoint URL to prevent SSRF attacks.

    Allows: http/https to localhost, private IPs, and LAN addresses.
    Blocks: cloud metadata endpoints, non-http schemes.
    """
    parsed = urlparse(url)

    # Only allow http and https schemes
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Invalid URL scheme '{parsed.scheme}'. Only http and https are allowed.")

    if not parsed.hostname:
        raise ValueError("Invalid URL: no hostname specified.")

    # Resolve hostname to check against blocked ranges
    hostname = parsed.hostname
    try:
        addr = ipaddress.ip_address(hostname)
        for blocked_range in BLOCKED_IP_RANGES:
            if addr in blocked_range:
                raise ValueError(
                    f"Blocked endpoint: {hostname} is in a restricted IP range (cloud metadata). "
                    "Use a non-metadata IP address for your local AI server."
                )
    except ValueError as e:
        if "restricted IP range" in str(e) or "Invalid URL" in str(e) or "no hostname" in str(e):
            raise
        # hostname is not an IP literal (it's a domain name) -- allow it
        # DNS resolution check could be added here for extra security

    return url

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

logger = logging.getLogger(__name__)

# Local models may be slow on consumer hardware
LOCAL_REQUEST_TIMEOUT = 120  # seconds


class LocalProvider(BaseAIProvider):
    """Local/OpenAI-compatible AI provider.

    Connects to any server exposing OpenAI-compatible /v1/chat/completions
    and /v1/models endpoints. Works with Ollama, LM Studio, vLLM, LocalAI,
    and similar tools.
    """

    provider_type = ProviderType.LOCAL
    auth_type = AuthType.LOCAL_ENDPOINT
    supported_models: List[str] = []

    def __init__(self):
        super().__init__()
        self._client: Optional[OpenAI] = None
        self._discovered_models: List[ModelInfo] = []
        self._default_model: Optional[str] = None

    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the local provider with endpoint URL.

        Args:
            credentials: Must contain local_endpoint (base URL).
                         api_key is optional.

        Returns:
            True if initialization succeeded
        """
        if not credentials.local_endpoint:
            logger.error("Local provider initialization failed: No endpoint provided")
            return False

        try:
            # Validate endpoint URL to prevent SSRF
            _validate_local_endpoint(credentials.local_endpoint)
            base_url = credentials.local_endpoint.rstrip("/")
            # OpenAI SDK requires an api_key; use placeholder for local servers
            api_key = credentials.api_key or "not-needed"

            self._client = OpenAI(
                base_url=base_url,
                api_key=api_key,
                timeout=LOCAL_REQUEST_TIMEOUT,
            )
            self._credentials = credentials
            self._initialized = True

            # Try to discover models (non-fatal if it fails)
            try:
                await self._discover_models()
            except Exception as e:
                logger.warning(f"Model discovery during init failed (non-fatal): {e}")

            logger.info(f"Local provider initialized at {base_url}")
            return True
        except Exception as e:
            logger.error(f"Local provider initialization failed: {e}")
            return False

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate the local endpoint is reachable.

        Tries listing models first (lightweight), then falls back to
        a minimal chat completion.

        Args:
            credentials: Credentials to validate

        Returns:
            True if the endpoint is reachable and responding
        """
        if not credentials.local_endpoint:
            return False

        try:
            base_url = credentials.local_endpoint.rstrip("/")
            api_key = credentials.api_key or "not-needed"
            test_client = OpenAI(
                base_url=base_url,
                api_key=api_key,
                timeout=15,  # Short timeout for validation
            )

            # Try listing models (most lightweight check)
            models = await asyncio.to_thread(lambda: test_client.models.list())
            if models and models.data:
                logger.info(f"Local endpoint validated: {len(models.data)} models found")
                return True

            # If model list is empty, try a minimal completion
            first_model = models.data[0].id if models.data else "test"
            await asyncio.to_thread(
                lambda: test_client.chat.completions.create(
                    model=first_model,
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=5,
                )
            )
            return True
        except APIConnectionError as e:
            logger.warning(f"Local endpoint not reachable: {e}")
            return False
        except Exception as e:
            logger.warning(f"Local endpoint validation failed: {e}")
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
        """Generate a response using the local model.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model ID to use (as reported by /v1/models)
            max_tokens: Maximum response tokens
            temperature: Sampling temperature
            system_prompt: Optional system prompt
            **kwargs: Additional parameters (ignored)

        Returns:
            AIResponse with generated content
        """
        if not self._client:
            raise InvalidRequestError("Provider not initialized", ProviderType.LOCAL)

        # Build messages with system prompt
        api_messages = []
        if system_prompt:
            api_messages.append({"role": "system", "content": system_prompt})

        # Add conversation messages (skip duplicate system messages)
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

        except APIConnectionError as e:
            raise ServerError(
                f"Cannot reach local model server: {e}", ProviderType.LOCAL
            )
        except APITimeoutError as e:
            raise ProviderTimeoutError(
                f"Local model timed out (>{LOCAL_REQUEST_TIMEOUT}s): {e}",
                ProviderType.LOCAL,
            )
        except APIError as e:
            if e.status_code == 401:
                raise AuthenticationError(str(e), ProviderType.LOCAL)
            elif e.status_code == 429:
                raise RateLimitError(str(e), ProviderType.LOCAL)
            elif e.status_code and e.status_code >= 500:
                raise ServerError(str(e), ProviderType.LOCAL)
            else:
                raise InvalidRequestError(str(e), ProviderType.LOCAL)
        except Exception as e:
            logger.error(f"Local provider error: {e}")
            raise ServerError(str(e), ProviderType.LOCAL)

    def get_available_models(self) -> List[ModelInfo]:
        """Get previously discovered models.

        Returns:
            List of ModelInfo objects from last discovery
        """
        return self._discovered_models

    def get_default_model(self) -> Optional[str]:
        """Get the default model (first discovered model).

        Returns:
            Model ID string or None
        """
        return self._default_model

    async def _discover_models(self) -> List[ModelInfo]:
        """Query /v1/models endpoint to discover available models."""
        if not self._client:
            return []

        models_response = await asyncio.to_thread(
            lambda: self._client.models.list()
        )

        discovered = []
        for m in models_response.data:
            info = ModelInfo(
                model_id=m.id,
                display_name=m.id,
                description=f"Locally hosted: {m.id}",
                context_window=None,
                max_output_tokens=None,
                supports_vision=False,
                supports_function_calling=False,
            )
            discovered.append(info)

        self._discovered_models = discovered
        self.supported_models = [m.model_id for m in discovered]

        if discovered and not self._default_model:
            self._default_model = discovered[0].model_id

        logger.info(f"Discovered {len(discovered)} local models")
        return discovered

    async def discover_models(self) -> List[ModelInfo]:
        """Public method for API endpoint to trigger model discovery.

        Returns:
            List of ModelInfo objects from the endpoint
        """
        return await self._discover_models()
