"""Tests for AI action application endpoint (/ai/actions/apply).

Validates the full lifecycle of AI-generated actions:
- Creating new metrics via add_metric
- Updating existing metrics via update_metric
- Soft-deleting metrics via delete_metric
- Audit log (AIChangeLog) creation
- Error handling for confirmations, duplicates, missing metrics
"""

import uuid
from datetime import datetime
from unittest.mock import MagicMock, call, patch

import pytest

from src.models import AIChangeLog, Metric, MetricDirection


class TestActionApply:
    """Tests for the POST /ai/actions/apply endpoint."""

    def test_apply_add_metric_action(self, client, mock_db):
        """Applying an add_metric action should create a new metric in the database."""
        # Mock: no existing metric with that name
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Mock the Metric constructor in the router module so it returns
        # a controlled mock object (the real Metric SQLAlchemy model cannot
        # accept schema property fields like csf_function without a real DB).
        new_metric_id = uuid.uuid4()
        mock_metric_instance = MagicMock(spec=Metric)
        mock_metric_instance.id = new_metric_id
        mock_metric_instance.name = "Test MFA Metric"

        with patch("src.routers.ai.Metric", return_value=mock_metric_instance):
            response = client.post(
                "/api/v1/ai/actions/apply",
                json={
                    "actions": [
                        {
                            "action": "add_metric",
                            "metric": {
                                "name": "Test MFA Metric",
                                "description": "Percentage of users with MFA enabled",
                                "direction": "higher_is_better",
                                "priority_rank": 1,
                                "target_value": 95.0,
                                "target_units": "%",
                            },
                        }
                    ],
                    "user_confirmation": True,
                },
            )

        assert response.status_code == 200
        data = response.json()

        assert len(data["applied_results"]) == 1
        assert data["applied_results"][0]["action"] == "add_metric"
        assert data["applied_results"][0]["status"] == "created"
        assert data["applied_results"][0]["metric_name"] == "Test MFA Metric"

        # Verify db.add was called (once for metric, once for change log)
        assert mock_db.add.call_count >= 2

    def test_apply_update_metric_action(self, client, mock_db):
        """Applying an update_metric action should modify the existing metric."""
        metric_id = uuid.uuid4()

        # Create a mock existing metric
        existing_metric = MagicMock(spec=Metric)
        existing_metric.id = metric_id
        existing_metric.name = "MFA Adoption Rate"
        existing_metric.target_value = 95.0
        existing_metric.description = "Original description"

        mock_db.query.return_value.filter.return_value.first.return_value = existing_metric

        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "update_metric",
                        "metric_id": str(metric_id),
                        "changes": {
                            "target_value": 99.0,
                            "description": "Updated to reflect zero-trust requirements",
                        },
                    }
                ],
                "user_confirmation": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["applied_results"]) == 1
        assert data["applied_results"][0]["action"] == "update_metric"
        assert data["applied_results"][0]["status"] == "updated"
        assert data["applied_results"][0]["changes_applied"]["target_value"] == 99.0

    def test_apply_delete_metric_action(self, client, mock_db):
        """Applying a delete_metric action should soft-delete (deactivate) the metric."""
        metric_id = uuid.uuid4()

        existing_metric = MagicMock(spec=Metric)
        existing_metric.id = metric_id
        existing_metric.name = "Deprecated Metric"
        existing_metric.active = True

        mock_db.query.return_value.filter.return_value.first.return_value = existing_metric

        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "delete_metric",
                        "metric_id": str(metric_id),
                    }
                ],
                "user_confirmation": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["applied_results"]) == 1
        assert data["applied_results"][0]["action"] == "delete_metric"
        assert data["applied_results"][0]["status"] == "deactivated"

        # Verify the metric was soft-deleted (active = False)
        assert existing_metric.active is False

    def test_apply_creates_audit_log(self, client, mock_db):
        """Applying any action should create an AIChangeLog entry."""
        metric_id = uuid.uuid4()

        existing_metric = MagicMock(spec=Metric)
        existing_metric.id = metric_id
        existing_metric.name = "Test Metric"
        existing_metric.active = True

        mock_db.query.return_value.filter.return_value.first.return_value = existing_metric

        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "delete_metric",
                        "metric_id": str(metric_id),
                    }
                ],
                "user_confirmation": True,
            },
        )

        assert response.status_code == 200

        # Check that an AIChangeLog was added
        add_calls = mock_db.add.call_args_list
        changelog_added = any(
            isinstance(call_args[0][0], AIChangeLog)
            for call_args in add_calls
            if call_args[0]
        )
        assert changelog_added, "Expected an AIChangeLog entry to be added to the session"

    def test_apply_rejects_unconfirmed(self, client, mock_db):
        """Actions without user_confirmation should be rejected with 400."""
        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "add_metric",
                        "metric": {
                            "name": "Unconfirmed Metric",
                            "direction": "higher_is_better",
                        },
                    }
                ],
                "user_confirmation": False,
            },
        )

        assert response.status_code == 400
        data = response.json()
        assert "confirmation" in data["detail"].lower()

    def test_apply_duplicate_name_error(self, client, mock_db):
        """Creating a metric with a name that already exists should produce an error."""
        # Mock: existing metric with the same name found
        existing_metric = MagicMock(spec=Metric)
        existing_metric.id = uuid.uuid4()
        existing_metric.name = "Duplicate Metric Name"

        mock_db.query.return_value.filter.return_value.first.return_value = existing_metric

        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "add_metric",
                        "metric": {
                            "name": "Duplicate Metric Name",
                            "direction": "higher_is_better",
                        },
                    }
                ],
                "user_confirmation": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        # The endpoint returns 200 with errors in the response body
        assert len(data["errors"]) > 0
        assert "already exists" in data["errors"][0].lower()
        assert len(data["applied_results"]) == 0

    def test_apply_nonexistent_metric_update(self, client, mock_db):
        """Updating a metric that does not exist should produce an error."""
        fake_id = uuid.uuid4()

        # Mock: no metric found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "update_metric",
                        "metric_id": str(fake_id),
                        "changes": {"target_value": 99.0},
                    }
                ],
                "user_confirmation": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["errors"]) > 0
        assert "not found" in data["errors"][0].lower()

    def test_apply_nonexistent_metric_delete(self, client, mock_db):
        """Deleting a metric that does not exist should produce an error."""
        fake_id = uuid.uuid4()

        mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "delete_metric",
                        "metric_id": str(fake_id),
                    }
                ],
                "user_confirmation": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["errors"]) > 0
        assert "not found" in data["errors"][0].lower()

    def test_apply_multiple_actions(self, client, mock_db):
        """Multiple actions in a single request should each be processed."""
        metric_id = uuid.uuid4()

        existing_metric = MagicMock(spec=Metric)
        existing_metric.id = metric_id
        existing_metric.name = "Existing Metric"
        existing_metric.active = True

        # First call returns None (for add_metric duplicate check),
        # second call returns existing_metric (for delete_metric lookup)
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            None,  # No duplicate for add_metric
            existing_metric,  # Found for delete_metric
        ]

        new_metric_id = uuid.uuid4()
        mock_new_metric = MagicMock(spec=Metric)
        mock_new_metric.id = new_metric_id
        mock_new_metric.name = "New Metric"

        with patch("src.routers.ai.Metric", return_value=mock_new_metric):
            response = client.post(
                "/api/v1/ai/actions/apply",
                json={
                    "actions": [
                        {
                            "action": "add_metric",
                            "metric": {
                                "name": "New Metric",
                                "direction": "higher_is_better",
                            },
                        },
                        {
                            "action": "delete_metric",
                            "metric_id": str(metric_id),
                        },
                    ],
                    "user_confirmation": True,
                },
            )

        assert response.status_code == 200
        data = response.json()

        assert len(data["applied_results"]) == 2
        assert data["applied_results"][0]["action"] == "add_metric"
        assert data["applied_results"][1]["action"] == "delete_metric"

    def test_apply_unknown_action_type(self, client, mock_db):
        """An unknown action type should be reported as an error.

        Note: The schema validates action type with regex, so this
        test verifies schema-level validation returns 422.
        """
        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "unknown_action",
                    }
                ],
                "user_confirmation": True,
            },
        )

        # The schema validation should reject this
        assert response.status_code == 422

    def test_apply_add_metric_missing_data(self, client, mock_db):
        """add_metric without metric data should produce an error."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.post(
            "/api/v1/ai/actions/apply",
            json={
                "actions": [
                    {
                        "action": "add_metric",
                        # No 'metric' field
                    }
                ],
                "user_confirmation": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["errors"]) > 0
        assert "no metric data" in data["errors"][0].lower()
