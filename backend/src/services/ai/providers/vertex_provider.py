"""GCP Vertex AI provider implementation.

Provides integration with Google Cloud's Vertex AI including:
- Gemini 2.0 Flash
- Gemini 1.5 Pro
- Gemini 1.5 Flash
- Claude (via Model Garden)
"""
import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

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

# Try to import google-genai
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai package not installed. Vertex AI provider will not be available.")


class VertexAIProvider(BaseAIProvider):
    """GCP Vertex AI provider.

    Implements the BaseAIProvider interface for Google's Vertex AI.
    Supports Gemini models and Claude via Model Garden.
    """

    provider_type = ProviderType.VERTEX
    auth_type = AuthType.GCP
    supported_models = [
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "claude-3-5-sonnet-v2@20241022",
    ]

    def __init__(self):
        super().__init__()
        self._client = None
        self._project: Optional[str] = None
        self._location: Optional[str] = None
        self._default_model = "gemini-1.5-pro"

    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the Vertex AI client with credentials.

        Args:
            credentials: Must contain:
                - gcp_project
                - gcp_location (defaults to us-central1)
                - gcp_credentials_json (service account JSON)

        Returns:
            True if initialization succeeded
        """
        if not GENAI_AVAILABLE:
            logger.error("Vertex AI initialization failed: google-genai package not installed")
            return False

        if not credentials.gcp_project:
            logger.error("Vertex AI initialization failed: No GCP project provided")
            return False

        self._project = credentials.gcp_project
        self._location = credentials.gcp_location or "us-central1"

        try:
            # Initialize the client
            if credentials.gcp_credentials_json:
                # Parse the service account JSON and set up credentials
                import tempfile
                import os

                # Write credentials to temp file (google-genai reads from file)
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                    f.write(credentials.gcp_credentials_json)
                    creds_file = f.name

                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_file

            self._client = genai.Client(
                vertexai=True,
                project=self._project,
                location=self._location,
            )

            self._credentials = credentials
            self._initialized = True
            logger.info(f"Vertex AI provider initialized: project={self._project}, location={self._location}")
            return True

        except Exception as e:
            logger.error(f"Vertex AI initialization failed: {e}")
            return False

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate GCP credentials by making a minimal API call.

        Args:
            credentials: Credentials to validate

        Returns:
            True if credentials are valid
        """
        if not GENAI_AVAILABLE:
            return False

        if not credentials.gcp_project:
            return False

        try:
            # Temporarily initialize to validate
            if credentials.gcp_credentials_json:
                import tempfile
                import os

                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                    f.write(credentials.gcp_credentials_json)
                    creds_file = f.name

                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_file

            test_client = genai.Client(
                vertexai=True,
                project=credentials.gcp_project,
                location=credentials.gcp_location or "us-central1",
            )

            # Make a minimal API call to validate
            await asyncio.to_thread(
                lambda: test_client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents="Hi",
                    config=types.GenerateContentConfig(max_output_tokens=10),
                )
            )
            return True

        except Exception as e:
            logger.error(f"Vertex AI credential validation error: {e}")
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
        """Generate a response using Vertex AI.

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
            raise InvalidRequestError("Provider not initialized", ProviderType.VERTEX)

        if not GENAI_AVAILABLE:
            raise InvalidRequestError("google-genai package not installed", ProviderType.VERTEX)

        # Validate model
        if not self.supports_model(model):
            logger.warning(f"Model {model} not in supported list, using anyway")

        start_time = time.time()

        try:
            # Handle Claude models differently (via Model Garden)
            if "claude" in model.lower():
                return await self._invoke_claude_model(
                    model, messages, system_prompt, max_tokens, temperature, start_time
                )
            else:
                return await self._invoke_gemini_model(
                    model, messages, system_prompt, max_tokens, temperature, start_time
                )

        except Exception as e:
            error_str = str(e).lower()
            if "permission" in error_str or "unauthorized" in error_str or "403" in error_str:
                raise AuthenticationError(str(e), ProviderType.VERTEX)
            elif "quota" in error_str or "rate" in error_str or "429" in error_str:
                raise RateLimitError(str(e), ProviderType.VERTEX)
            elif "timeout" in error_str:
                raise ProviderTimeoutError(str(e), ProviderType.VERTEX)
            else:
                logger.error(f"Vertex AI API error: {e}")
                raise ServerError(str(e), ProviderType.VERTEX)

    async def _invoke_gemini_model(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        start_time: float,
    ) -> AIResponse:
        """Invoke Gemini model on Vertex AI."""
        # Build contents from messages
        contents = []
        for msg in messages:
            if msg["role"] == "system":
                continue  # Handle system prompt separately
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part(text=msg["content"])]
            ))

        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        if system_prompt:
            config.system_instruction = system_prompt

        response = await asyncio.to_thread(
            lambda: self._client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        )

        latency_ms = (time.time() - start_time) * 1000

        # Extract usage metadata if available
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, 'usage_metadata'):
            input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
            output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)

        return AIResponse(
            content=response.text,
            model_used=model,
            provider=self.provider_type,
            tokens_used={
                "input": input_tokens,
                "output": output_tokens,
            },
            latency_ms=latency_ms,
            finish_reason=response.candidates[0].finish_reason.name if response.candidates else None,
            raw_response=response,
        )

    async def _invoke_claude_model(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        start_time: float,
    ) -> AIResponse:
        """Invoke Claude model via Vertex AI Model Garden.

        Note: Claude on Vertex uses Anthropic's API format.
        """
        # For Claude on Vertex, we need to use the Anthropic client format
        # This is a simplified implementation - full implementation would use
        # the anthropic-vertex package
        from anthropic import AnthropicVertex

        client = AnthropicVertex(
            project_id=self._project,
            region=self._location,
        )

        api_messages = [m for m in messages if m["role"] != "system"]

        response = await asyncio.to_thread(
            lambda: client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt or "",
                messages=api_messages,
            )
        )

        latency_ms = (time.time() - start_time) * 1000

        return AIResponse(
            content=response.content[0].text,
            model_used=model,
            provider=self.provider_type,
            tokens_used={
                "input": response.usage.input_tokens,
                "output": response.usage.output_tokens,
            },
            latency_ms=latency_ms,
            finish_reason=response.stop_reason,
            raw_response=response,
        )

    def get_available_models(self) -> List[ModelInfo]:
        """Get available Vertex AI models.

        Returns:
            List of ModelInfo objects
        """
        return get_models_for_provider(ProviderType.VERTEX)
