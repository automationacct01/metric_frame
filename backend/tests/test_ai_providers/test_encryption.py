"""Tests for the credential encryption utility."""
import os
import pytest
from unittest.mock import patch

from src.services.ai.utils.encryption import CredentialEncryption


class TestCredentialEncryption:
    """Tests for CredentialEncryption class."""

    @pytest.fixture(autouse=True)
    def reset_singleton(self):
        """Reset the singleton before each test."""
        # Clear the singleton state
        CredentialEncryption._instance = None
        CredentialEncryption._fernet = None
        yield
        # Clean up after test
        CredentialEncryption._instance = None
        CredentialEncryption._fernet = None

    @pytest.fixture
    def test_master_key(self):
        """Generate a test master key."""
        return CredentialEncryption.generate_master_key()

    @pytest.fixture
    def encryption_with_key(self, test_master_key):
        """Create encryption instance with test key."""
        with patch.dict(os.environ, {"AI_CREDENTIALS_MASTER_KEY": test_master_key}):
            return CredentialEncryption()

    def test_generate_master_key(self):
        """Test master key generation."""
        key = CredentialEncryption.generate_master_key()
        assert isinstance(key, str)
        assert len(key) == 44  # Base64 encoded 32-byte key

    def test_encryption_available_with_key(self, encryption_with_key):
        """Test that encryption is available when key is set."""
        assert encryption_with_key.is_available is True

    def test_encryption_not_available_without_key(self):
        """Test that encryption is not available without key."""
        # Remove the key from environment entirely
        env_without_key = {k: v for k, v in os.environ.items() if k != "AI_CREDENTIALS_MASTER_KEY"}
        with patch.dict(os.environ, env_without_key, clear=True):
            encryption = CredentialEncryption()
            assert encryption.is_available is False

    def test_encrypt_decrypt_string(self, encryption_with_key):
        """Test encrypting and decrypting a simple string."""
        original = "my-secret-api-key"
        encrypted = encryption_with_key.encrypt(original)

        # Encrypted should be different from original
        assert encrypted != original
        assert isinstance(encrypted, str)

        # Decrypted should match original
        decrypted = encryption_with_key.decrypt(encrypted)
        assert decrypted == original

    def test_encrypt_decrypt_credentials(self, encryption_with_key):
        """Test encrypting and decrypting credential dictionaries."""
        credentials = {
            "api_key": "sk-test-12345",
            "azure_endpoint": "https://test.openai.azure.com",
            "azure_deployment": "gpt-4o",
        }

        encrypted = encryption_with_key.encrypt_credentials(credentials)
        assert isinstance(encrypted, str)
        assert "sk-test-12345" not in encrypted  # Key should not be visible

        decrypted = encryption_with_key.decrypt_credentials(encrypted)
        assert decrypted == credentials

    def test_encrypt_empty_credentials(self, encryption_with_key):
        """Test encrypting empty credentials."""
        credentials = {}
        encrypted = encryption_with_key.encrypt_credentials(credentials)
        decrypted = encryption_with_key.decrypt_credentials(encrypted)
        assert decrypted == {}

    def test_encrypt_credentials_with_none_values(self, encryption_with_key):
        """Test encrypting credentials with None values."""
        credentials = {
            "api_key": "test-key",
            "azure_endpoint": None,
        }
        encrypted = encryption_with_key.encrypt_credentials(credentials)
        decrypted = encryption_with_key.decrypt_credentials(encrypted)
        assert decrypted["api_key"] == "test-key"
        assert decrypted["azure_endpoint"] is None

    def test_decrypt_with_wrong_key(self, test_master_key):
        """Test that decryption fails with wrong key."""
        # Encrypt with one key
        with patch.dict(os.environ, {"AI_CREDENTIALS_MASTER_KEY": test_master_key}):
            encryption1 = CredentialEncryption()
            encrypted = encryption1.encrypt("secret")

        # Reset singleton before using different key
        CredentialEncryption._instance = None
        CredentialEncryption._fernet = None

        # Try to decrypt with different key
        new_key = CredentialEncryption.generate_master_key()
        with patch.dict(os.environ, {"AI_CREDENTIALS_MASTER_KEY": new_key}):
            encryption2 = CredentialEncryption()
            with pytest.raises(ValueError):  # Our wrapper raises ValueError
                encryption2.decrypt(encrypted)

    def test_each_encryption_is_unique(self, encryption_with_key):
        """Test that encrypting the same value twice produces different ciphertext."""
        original = "test-value"
        encrypted1 = encryption_with_key.encrypt(original)
        encrypted2 = encryption_with_key.encrypt(original)

        # Fernet uses random IV, so encryptions should differ
        assert encrypted1 != encrypted2

        # But both should decrypt to same value
        assert encryption_with_key.decrypt(encrypted1) == original
        assert encryption_with_key.decrypt(encrypted2) == original

    def test_encrypt_unicode_content(self, encryption_with_key):
        """Test encrypting content with unicode characters."""
        original = "密钥🔐パスワード"
        encrypted = encryption_with_key.encrypt(original)
        decrypted = encryption_with_key.decrypt(encrypted)
        assert decrypted == original

    def test_encrypt_long_content(self, encryption_with_key):
        """Test encrypting large content like GCP credentials JSON."""
        # Simulate a large service account JSON
        large_json = '{"type": "service_account", "project_id": "test", "private_key": "' + "x" * 2000 + '"}'

        credentials = {"gcp_credentials_json": large_json}
        encrypted = encryption_with_key.encrypt_credentials(credentials)
        decrypted = encryption_with_key.decrypt_credentials(encrypted)

        assert decrypted["gcp_credentials_json"] == large_json
