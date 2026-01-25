"""Encryption utilities for AI provider credentials.

Uses Fernet symmetric encryption for secure storage of API keys
and other sensitive credentials.
"""
import os
import json
import logging
from typing import Dict, Any, Optional

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


class CredentialEncryption:
    """Handles encryption/decryption of AI provider credentials.

    Uses Fernet symmetric encryption with a master key stored in environment variables.
    The master key must be a 32-byte URL-safe base64-encoded key.

    Example:
        >>> encryption = CredentialEncryption()
        >>> encrypted = encryption.encrypt('sk-ant-api03-xxxxx')
        >>> decrypted = encryption.decrypt(encrypted)
        >>> assert decrypted == 'sk-ant-api03-xxxxx'
    """

    _instance: Optional["CredentialEncryption"] = None
    _fernet: Optional[Fernet] = None

    def __new__(cls) -> "CredentialEncryption":
        """Singleton pattern - reuse the same Fernet instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        """Initialize the encryption utility with the master key from environment."""
        if self._fernet is not None:
            return  # Already initialized

        master_key = os.getenv("AI_CREDENTIALS_MASTER_KEY")
        if not master_key:
            logger.warning(
                "AI_CREDENTIALS_MASTER_KEY not set. Credential encryption will fail. "
                "Generate a key with CredentialEncryption.generate_master_key()"
            )
            return

        try:
            self._fernet = Fernet(master_key.encode())
            logger.info("Credential encryption initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Fernet encryption: {e}")
            raise ValueError(
                "Invalid AI_CREDENTIALS_MASTER_KEY. Must be a 32-byte URL-safe base64-encoded key. "
                "Generate a new key with CredentialEncryption.generate_master_key()"
            ) from e

    @property
    def is_available(self) -> bool:
        """Check if encryption is available."""
        return self._fernet is not None

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a credential string.

        Args:
            plaintext: The sensitive credential to encrypt (e.g., API key)

        Returns:
            Base64-encoded encrypted string

        Raises:
            ValueError: If encryption is not available (no master key)
        """
        if not self._fernet:
            raise ValueError(
                "Encryption not available. Set AI_CREDENTIALS_MASTER_KEY environment variable."
            )
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a credential string.

        Args:
            ciphertext: The encrypted credential to decrypt

        Returns:
            The original plaintext credential

        Raises:
            ValueError: If encryption is not available or decryption fails
        """
        if not self._fernet:
            raise ValueError(
                "Encryption not available. Set AI_CREDENTIALS_MASTER_KEY environment variable."
            )
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except InvalidToken as e:
            logger.error("Failed to decrypt credential - invalid token or wrong key")
            raise ValueError("Failed to decrypt credential. The data may be corrupted or the key may have changed.") from e

    def encrypt_credentials(self, credentials: Dict[str, Any]) -> str:
        """Encrypt a credentials dictionary as JSON.

        Args:
            credentials: Dictionary of credential fields (api_key, azure_endpoint, etc.)

        Returns:
            Encrypted JSON string
        """
        json_str = json.dumps(credentials)
        return self.encrypt(json_str)

    def decrypt_credentials(self, encrypted: str) -> Dict[str, Any]:
        """Decrypt an encrypted credentials JSON string.

        Args:
            encrypted: The encrypted JSON string

        Returns:
            Dictionary of credential fields
        """
        json_str = self.decrypt(encrypted)
        return json.loads(json_str)

    @staticmethod
    def generate_master_key() -> str:
        """Generate a new master encryption key.

        This should be called once during initial setup and the result
        stored securely in the AI_CREDENTIALS_MASTER_KEY environment variable.

        Returns:
            A 32-byte URL-safe base64-encoded key string

        Example:
            >>> key = CredentialEncryption.generate_master_key()
            >>> print(f"AI_CREDENTIALS_MASTER_KEY={key}")
        """
        return Fernet.generate_key().decode()

    @staticmethod
    def validate_master_key(key: str) -> bool:
        """Validate that a key is a valid Fernet key.

        Args:
            key: The key to validate

        Returns:
            True if the key is valid, False otherwise
        """
        try:
            Fernet(key.encode())
            return True
        except Exception:
            return False
