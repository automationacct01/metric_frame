"""AWS Bedrock provider implementation.

Provides integration with AWS Bedrock foundation models including:
- Anthropic Claude on Bedrock
- Meta Llama on Bedrock
- Amazon Titan
- Amazon Nova
"""
import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

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


class BedrockProvider(BaseAIProvider):
    """AWS Bedrock AI provider.

    Implements the BaseAIProvider interface for AWS Bedrock.
    Supports Claude, Llama, Titan, and other foundation models.
    """

    provider_type = ProviderType.BEDROCK
    auth_type = AuthType.AWS_IAM
    supported_models = [
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-haiku-20241022-v1:0",
        "meta.llama3-2-90b-instruct-v1:0",
        "amazon.titan-text-premier-v1:0",
    ]

    def __init__(self):
        super().__init__()
        self._client = None
        self._region: Optional[str] = None
        self._default_model = "anthropic.claude-3-5-sonnet-20241022-v2:0"

    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the Bedrock client with credentials.

        Args:
            credentials: Must contain:
                - aws_access_key
                - aws_secret_key
                - aws_region (defaults to us-east-1)
                - aws_session_token (optional, for temporary credentials)

        Returns:
            True if initialization succeeded
        """
        if not credentials.aws_access_key or not credentials.aws_secret_key:
            logger.error("Bedrock initialization failed: Missing AWS credentials")
            return False

        self._region = credentials.aws_region or "us-east-1"

        try:
            session_kwargs = {
                "aws_access_key_id": credentials.aws_access_key,
                "aws_secret_access_key": credentials.aws_secret_key,
                "region_name": self._region,
            }
            if credentials.aws_session_token:
                session_kwargs["aws_session_token"] = credentials.aws_session_token

            session = boto3.Session(**session_kwargs)
            self._client = session.client("bedrock-runtime")
            self._credentials = credentials
            self._initialized = True
            logger.info(f"Bedrock provider initialized: region={self._region}")
            return True
        except Exception as e:
            logger.error(f"Bedrock initialization failed: {e}")
            return False

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate AWS credentials by making a minimal API call.

        Args:
            credentials: Credentials to validate

        Returns:
            True if credentials are valid
        """
        if not credentials.aws_access_key or not credentials.aws_secret_key:
            return False

        region = credentials.aws_region or "us-east-1"

        try:
            session_kwargs = {
                "aws_access_key_id": credentials.aws_access_key,
                "aws_secret_access_key": credentials.aws_secret_key,
                "region_name": region,
            }
            if credentials.aws_session_token:
                session_kwargs["aws_session_token"] = credentials.aws_session_token

            session = boto3.Session(**session_kwargs)
            client = session.client("bedrock-runtime")

            # Make a minimal API call to validate using Claude Haiku (smallest model)
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 10,
                "messages": [{"role": "user", "content": "Hi"}],
            })

            await asyncio.to_thread(
                lambda: client.invoke_model(
                    modelId="anthropic.claude-3-5-haiku-20241022-v1:0",
                    body=body,
                )
            )
            return True

        except NoCredentialsError:
            logger.warning("Bedrock credential validation failed: No credentials")
            return False
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ["AccessDeniedException", "UnauthorizedAccess"]:
                logger.warning("Bedrock credential validation failed: Access denied")
                return False
            logger.error(f"Bedrock credential validation error: {e}")
            return False
        except Exception as e:
            logger.error(f"Bedrock credential validation error: {e}")
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
        """Generate a response using AWS Bedrock.

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
            raise InvalidRequestError("Provider not initialized", ProviderType.BEDROCK)

        # Validate model
        if not self.supports_model(model):
            logger.warning(f"Model {model} not in supported list, using anyway")

        # Build messages for Bedrock (filter out system messages)
        api_messages = [m for m in messages if m["role"] != "system"]

        start_time = time.time()

        try:
            # Handle different model families
            if model.startswith("anthropic."):
                return await self._invoke_anthropic_model(
                    model, api_messages, system_prompt, max_tokens, temperature, start_time
                )
            elif model.startswith("meta."):
                return await self._invoke_llama_model(
                    model, api_messages, system_prompt, max_tokens, temperature, start_time
                )
            elif model.startswith("amazon."):
                return await self._invoke_titan_model(
                    model, api_messages, system_prompt, max_tokens, temperature, start_time
                )
            else:
                # Default to Anthropic format
                return await self._invoke_anthropic_model(
                    model, api_messages, system_prompt, max_tokens, temperature, start_time
                )

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "ThrottlingException":
                raise RateLimitError(str(e), ProviderType.BEDROCK)
            elif error_code in ["AccessDeniedException", "UnauthorizedAccess"]:
                raise AuthenticationError(str(e), ProviderType.BEDROCK)
            elif error_code == "ValidationException":
                raise InvalidRequestError(str(e), ProviderType.BEDROCK)
            else:
                raise ServerError(str(e), ProviderType.BEDROCK)
        except asyncio.TimeoutError as e:
            raise ProviderTimeoutError(str(e), ProviderType.BEDROCK)
        except Exception as e:
            logger.error(f"Bedrock API error: {e}")
            raise ServerError(str(e), ProviderType.BEDROCK)

    async def _invoke_anthropic_model(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        start_time: float,
    ) -> AIResponse:
        """Invoke Anthropic Claude model on Bedrock."""
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system_prompt:
            body["system"] = system_prompt

        response = await asyncio.to_thread(
            lambda: self._client.invoke_model(
                modelId=model,
                body=json.dumps(body),
            )
        )

        response_body = json.loads(response["body"].read())
        latency_ms = (time.time() - start_time) * 1000

        return AIResponse(
            content=response_body["content"][0]["text"],
            model_used=model,
            provider=self.provider_type,
            tokens_used={
                "input": response_body.get("usage", {}).get("input_tokens", 0),
                "output": response_body.get("usage", {}).get("output_tokens", 0),
            },
            latency_ms=latency_ms,
            finish_reason=response_body.get("stop_reason"),
            raw_response=response_body,
        )

    async def _invoke_llama_model(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        start_time: float,
    ) -> AIResponse:
        """Invoke Meta Llama model on Bedrock."""
        # Build prompt from messages
        prompt_parts = []
        if system_prompt:
            prompt_parts.append(f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n{system_prompt}<|eot_id|>")

        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            prompt_parts.append(f"<|start_header_id|>{role}<|end_header_id|>\n{content}<|eot_id|>")

        prompt_parts.append("<|start_header_id|>assistant<|end_header_id|>")
        prompt = "\n".join(prompt_parts)

        body = {
            "prompt": prompt,
            "max_gen_len": max_tokens,
            "temperature": temperature,
        }

        response = await asyncio.to_thread(
            lambda: self._client.invoke_model(
                modelId=model,
                body=json.dumps(body),
            )
        )

        response_body = json.loads(response["body"].read())
        latency_ms = (time.time() - start_time) * 1000

        return AIResponse(
            content=response_body.get("generation", ""),
            model_used=model,
            provider=self.provider_type,
            tokens_used={
                "input": response_body.get("prompt_token_count", 0),
                "output": response_body.get("generation_token_count", 0),
            },
            latency_ms=latency_ms,
            finish_reason=response_body.get("stop_reason"),
            raw_response=response_body,
        )

    async def _invoke_titan_model(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        start_time: float,
    ) -> AIResponse:
        """Invoke Amazon Titan model on Bedrock."""
        # Build prompt from messages
        prompt_parts = []
        if system_prompt:
            prompt_parts.append(f"System: {system_prompt}")

        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt_parts.append(f"{role}: {msg['content']}")

        prompt = "\n\n".join(prompt_parts) + "\n\nAssistant:"

        body = {
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": max_tokens,
                "temperature": temperature,
            }
        }

        response = await asyncio.to_thread(
            lambda: self._client.invoke_model(
                modelId=model,
                body=json.dumps(body),
            )
        )

        response_body = json.loads(response["body"].read())
        latency_ms = (time.time() - start_time) * 1000

        results = response_body.get("results", [{}])
        content = results[0].get("outputText", "") if results else ""

        return AIResponse(
            content=content,
            model_used=model,
            provider=self.provider_type,
            tokens_used={
                "input": response_body.get("inputTextTokenCount", 0),
                "output": results[0].get("tokenCount", 0) if results else 0,
            },
            latency_ms=latency_ms,
            finish_reason=results[0].get("completionReason") if results else None,
            raw_response=response_body,
        )

    def get_available_models(self) -> List[ModelInfo]:
        """Get available Bedrock models.

        Returns:
            List of ModelInfo objects
        """
        return get_models_for_provider(ProviderType.BEDROCK)
