"""Tests for the AI providers API endpoints."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import uuid4

from fastapi.testclient import TestClient

from src.main import app


class TestAIProvidersAPI:
    """Tests for AI providers API endpoints."""

    @pytest.fixture
    def client(self):
        """Create a test client."""
        return TestClient(app)

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        with patch("src.routers.ai_providers.get_db") as mock:
            session = MagicMock()
            mock.return_value = session
            yield session

    def test_list_providers(self, client):
        """Test listing all AI providers."""
        response = client.get("/api/v1/ai-providers/")

        assert response.status_code == 200
        data = response.json()

        assert "providers" in data
        assert "total" in data
        assert data["total"] == 7  # 7 providers (including Local Models)

        # Verify provider structure
        providers = data["providers"]
        provider_codes = {p["code"] for p in providers}
        assert "anthropic" in provider_codes
        assert "openai" in provider_codes
        assert "together" in provider_codes
        assert "azure" in provider_codes
        assert "bedrock" in provider_codes
        assert "vertex" in provider_codes

    def test_get_provider_anthropic(self, client):
        """Test getting Anthropic provider details."""
        response = client.get("/api/v1/ai-providers/anthropic")

        assert response.status_code == 200
        data = response.json()

        assert data["code"] == "anthropic"
        assert data["name"] == "Anthropic Claude"
        assert data["auth_type"] == "api_key"
        assert len(data["auth_fields"]) > 0
        assert len(data["models"]) > 0

    def test_get_provider_not_found(self, client):
        """Test getting non-existent provider."""
        response = client.get("/api/v1/ai-providers/nonexistent")

        assert response.status_code == 404

    def test_get_provider_models(self, client):
        """Test getting models for a provider."""
        response = client.get("/api/v1/ai-providers/openai/models")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) > 0

        # Verify model structure
        model = data[0]
        assert "model_id" in model
        assert "display_name" in model
        assert "context_window" in model

    def test_list_configurations_empty(self, client, mock_db):
        """Test listing configurations when none exist."""
        mock_db.query.return_value.filter.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.get("/api/v1/ai-providers/configurations")

        assert response.status_code == 200
        data = response.json()

        assert "configurations" in data
        assert data["configurations"] == []
        assert data["total"] == 0


class TestAIProvidersAPIValidation:
    """Tests for API input validation."""

    @pytest.fixture
    def client(self):
        """Create a test client."""
        return TestClient(app)

    def test_create_configuration_missing_provider(self, client):
        """Test creating configuration without provider code."""
        response = client.post(
            "/api/v1/ai-providers/configurations",
            json={
                "credentials": {"api_key": "test"},
            }
        )

        assert response.status_code == 422  # Validation error

    def test_create_configuration_invalid_provider(self, client):
        """Test creating configuration with invalid provider."""
        with patch("src.routers.ai_providers.get_db") as mock_get_db:
            mock_session = MagicMock()
            mock_get_db.return_value = mock_session

            response = client.post(
                "/api/v1/ai-providers/configurations",
                json={
                    "provider_code": "invalid_provider",
                    "credentials": {"api_key": "test"},
                }
            )

            assert response.status_code == 400


class TestAIProvidersAPIAuth:
    """Tests for API authentication requirements."""

    @pytest.fixture
    def client(self):
        """Create a test client."""
        return TestClient(app)

    def test_provider_endpoints_require_no_auth(self, client):
        """Test that provider discovery endpoints are public."""
        # These should work without authentication
        response = client.get("/api/v1/ai-providers/")
        assert response.status_code == 200

        response = client.get("/api/v1/ai-providers/anthropic")
        assert response.status_code == 200

        response = client.get("/api/v1/ai-providers/openai/models")
        assert response.status_code == 200
