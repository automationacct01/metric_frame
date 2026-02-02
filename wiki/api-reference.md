# API Reference

> **Last Updated:** January 2026
> **Status:** Active Development

---

Complete REST API documentation for MetricFrame backend services.

## Base URL

```
http://localhost:8002/api/v1
```

Production deployments should use HTTPS.

## Authentication

The API uses token-based authentication. Include the token in subsequent requests:

```http
X-User-Email: user@example.com
```

Or use the Authorization header:

```http
Authorization: Bearer <session_token>
```

For detailed authentication documentation, see [User Management](user-management).

## Response Format

All responses follow a consistent JSON structure:

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-15T10:30:00Z",
    "request_id": "uuid"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of error",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-01-15T10:30:00Z",
    "request_id": "uuid"
  }
}
```

## Endpoints by Router

---

## Authentication Router

Base path: `/api/v1/auth`

### Check Auth Status

```http
GET /auth/status
```

Returns whether any users exist (determines login vs registration flow).

**Response:**
```json
{
  "has_users": true,
  "message": "Users exist, please login"
}
```

### Register User

```http
POST /auth/register
Content-Type: application/json
```

**Request Body (First Admin):**
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword123",
  "security_question_1": "What was the name of your first pet?",
  "security_answer_1": "Fluffy",
  "security_question_2": "In what city were you born?",
  "security_answer_2": "New York"
}
```

**Request Body (Invited User):**
```json
{
  "name": "Team Member",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (First Admin):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  },
  "token": "session_token_here",
  "recovery_key": "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "editor"
  },
  "token": "session_token_here"
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response:** 200 OK

### Validate Token

```http
GET /auth/validate?token={session_token}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "editor"
  }
}
```

### Password Recovery - Get Questions

```http
GET /auth/recovery-questions/{email}
```

**Response:**
```json
{
  "question_1": "What was the name of your first pet?",
  "question_2": "In what city were you born?"
}
```

### Password Recovery - With Key

```http
POST /auth/recover-with-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "recovery_key": "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX",
  "new_password": "newpassword123"
}
```

### Password Recovery - With Questions

```http
POST /auth/recover-with-questions
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "answer_1": "Fluffy",
  "answer_2": "New York",
  "new_password": "newpassword123"
}
```

### Change Password

```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

### Admin: Invite User

```http
POST /auth/invite
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "editor"
}
```

### Admin: List Users

```http
GET /auth/users
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "role": "editor",
      "active": true,
      "last_login_at": "2026-02-02T10:30:00Z"
    }
  ]
}
```

### Admin: Update User Role

```http
PUT /auth/users/{user_id}/role
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "admin"
}
```

### Admin: Update User Status

```http
PUT /auth/users/{user_id}/active
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "active": false
}
```

### Admin: Delete User

```http
DELETE /auth/users/{user_id}
Authorization: Bearer <admin_token>
```

**Response:** 204 No Content

### Admin: Reset User Password

```http
POST /auth/reset-password/{user_id}
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "new_password": "temporaryPassword123"
}
```

---

## Metrics Router

Base path: `/api/v1/metrics`

### List Metrics

```http
GET /metrics
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `function` | string | Filter by CSF function (GV, ID, PR, DE, RS, RC) |
| `category` | string | Filter by CSF category (e.g., PR.AA) |
| `priority` | string | Filter by priority (High, Medium, Low) |
| `search` | string | Search in name/description |
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Items per page (default: 25, max: 100) |

**Response:**
```json
{
  "data": {
    "metrics": [
      {
        "id": "uuid",
        "metric_number": "PR-001",
        "name": "MFA Adoption Rate",
        "description": "Percentage of users with MFA enabled",
        "current_value": 85,
        "target_value": 95,
        "unit": "%",
        "direction": "higher_is_better",
        "csf_function": "PROTECT",
        "csf_category": "PR.AA",
        "priority": "High",
        "score": 89.5,
        "is_locked": false,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-15T10:30:00Z"
      }
    ],
    "total": 356,
    "page": 1,
    "page_size": 25
  }
}
```

### Get Single Metric

```http
GET /metrics/{metric_id}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "metric_number": "PR-001",
    "name": "MFA Adoption Rate",
    "description": "Percentage of users with MFA enabled",
    "current_value": 85,
    "target_value": 95,
    "unit": "%",
    "direction": "higher_is_better",
    "csf_function": "PROTECT",
    "csf_category": "PR.AA",
    "priority": "High",
    "score": 89.5,
    "is_locked": false,
    "history": [
      {
        "timestamp": "2026-01-15T00:00:00Z",
        "value": 85
      },
      {
        "timestamp": "2026-01-01T00:00:00Z",
        "value": 82
      }
    ]
  }
}
```

### Create Metric

```http
POST /metrics
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Security Metric",
  "description": "Description of the metric",
  "current_value": 75,
  "target_value": 90,
  "unit": "%",
  "direction": "higher_is_better",
  "csf_function": "PROTECT",
  "csf_category": "PR.AA",
  "priority": "High"
}
```

**Response:** Created metric object (201 Created)

### Update Metric

```http
PATCH /metrics/{metric_id}
Content-Type: application/json
```

**Request Body:** (partial update)
```json
{
  "current_value": 88,
  "priority": "Medium"
}
```

**Response:** Updated metric object

### Delete Metric

```http
DELETE /metrics/{metric_id}
```

**Response:** 204 No Content

### Export Metrics to CSV

```http
GET /metrics/export
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `function` | string | Filter by function |
| `ids` | string | Comma-separated metric IDs |

**Response:** CSV file download

---

## Scores Router

Base path: `/api/v1/scores`

### Get Score Overview

```http
GET /scores/overview
```

**Response:**
```json
{
  "data": {
    "overall_score": 72.5,
    "overall_rating": "Moderate",
    "functions": [
      {
        "code": "GV",
        "name": "GOVERN",
        "score": 78.0,
        "rating": "Low",
        "metric_count": 48,
        "trend": "up"
      },
      {
        "code": "ID",
        "name": "IDENTIFY",
        "score": 65.0,
        "rating": "Moderate",
        "metric_count": 47,
        "trend": "stable"
      }
    ],
    "catalog": {
      "id": "uuid",
      "name": "Default Catalog",
      "metric_count": 356
    }
  }
}
```

### Get Function Score Detail

```http
GET /scores/functions/{function_code}
```

**Response:**
```json
{
  "data": {
    "function": {
      "code": "PR",
      "name": "PROTECT",
      "score": 79.2,
      "rating": "Low"
    },
    "categories": [
      {
        "code": "PR.AA",
        "name": "Identity Management...",
        "score": 85.5,
        "rating": "Low",
        "metric_count": 8
      }
    ],
    "metrics_below_target": [
      {
        "id": "uuid",
        "name": "MFA Adoption",
        "score": 58,
        "gap": 37
      }
    ]
  }
}
```

### Get Category Scores

```http
GET /scores/categories
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `function` | string | Filter by function code |

**Response:**
```json
{
  "data": {
    "categories": [
      {
        "code": "PR.AA",
        "function_code": "PR",
        "name": "Identity Management...",
        "score": 85.5,
        "rating": "Low",
        "metric_count": 8
      }
    ]
  }
}
```

---

## AI Router

Base path: `/api/v1/ai`

### Chat with AI

```http
POST /ai/chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "mode": "metrics",
  "prompt": "Create a metric for tracking patch compliance",
  "context": {
    "function": "PROTECT",
    "user_id": "uuid"
  }
}
```

**Modes:** `metrics`, `explain`, `report`, `recommendations`, `enhance`

**Response:**
```json
{
  "data": {
    "response_type": "metric_suggestion",
    "content": {
      "metric": {
        "name": "Patch Compliance Rate",
        "description": "...",
        "target_value": 95,
        "direction": "higher_is_better",
        "csf_function": "PROTECT",
        "csf_category": "PR.PS",
        "priority": "High"
      },
      "explanation": "Based on your request...",
      "confidence": 0.95
    }
  }
}
```

### Enhance Metrics

```http
POST /ai/enhance
Content-Type: application/json
```

**Request Body:**
```json
{
  "catalog_items": [
    {
      "name": "patch compliance",
      "description": "patches",
      "target_value": 100
    }
  ],
  "enhancement_types": ["clarity", "targets", "priority"]
}
```

**Response:**
```json
{
  "data": {
    "enhancements": [
      {
        "original": {
          "name": "patch compliance"
        },
        "suggested": {
          "name": "Patch Compliance Rate",
          "description": "Percentage of systems...",
          "target_value": 95,
          "priority": "High"
        },
        "changes": ["name", "description", "target_value", "priority"],
        "reasoning": "Clarified name..."
      }
    ],
    "summary": {
      "total": 1,
      "enhanced": 1,
      "changes": 4
    }
  }
}
```

### Get AI Change Log

```http
GET /ai/changelog
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | string | Filter by action type |
| `user_id` | string | Filter by user |
| `start_date` | string | Start of date range |
| `end_date` | string | End of date range |

**Response:**
```json
{
  "data": {
    "entries": [
      {
        "id": "uuid",
        "timestamp": "2026-01-15T10:30:00Z",
        "action": "metric_created",
        "source": "ai_assistant",
        "mode": "metrics",
        "user_id": "uuid",
        "prompt": "Create a metric...",
        "result": {
          "metric_id": "uuid"
        }
      }
    ]
  }
}
```

---

## AI Providers Router

Base path: `/api/v1/ai-providers`

Manages "Bring Your Own Model" (BYOM) configuration for AI providers.

### List Available Providers

```http
GET /ai-providers/
```

**Response:**
```json
{
  "providers": [
    {
      "code": "anthropic",
      "name": "Anthropic Claude",
      "description": "Claude AI models from Anthropic",
      "auth_type": "api_key",
      "auth_fields": [
        {
          "name": "api_key",
          "label": "API Key",
          "type": "password",
          "required": true,
          "placeholder": "sk-ant-api03-..."
        }
      ],
      "models": [
        {
          "model_id": "claude-opus-4-5-20251101",
          "display_name": "Claude Opus 4.5",
          "context_window": 200000,
          "max_output_tokens": 64000,
          "supports_vision": true
        }
      ],
      "default_model": "claude-sonnet-4-5-20250929",
      "available": true
    }
  ]
}
```

### Get Provider Details

```http
GET /ai-providers/{provider_code}
```

**Response:** Single provider object with full model list

### Get Provider Models

```http
GET /ai-providers/{provider_code}/models
```

**Response:**
```json
{
  "models": [
    {
      "model_id": "claude-sonnet-4-5-20250929",
      "display_name": "Claude Sonnet 4.5",
      "description": "Best balance of intelligence and speed",
      "context_window": 200000,
      "max_output_tokens": 64000,
      "supports_vision": true,
      "supports_function_calling": true
    }
  ]
}
```

### List User Configurations

```http
GET /ai-providers/configurations
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | User ID (defaults to current user) |

**Response:**
```json
{
  "configurations": [
    {
      "id": "uuid",
      "provider_code": "anthropic",
      "is_active": true,
      "model_id": "claude-sonnet-4-5-20250929",
      "credentials_validated": true,
      "last_validated_at": "2026-01-15T10:30:00Z",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### Create Configuration

```http
POST /ai-providers/configurations
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider_code": "anthropic",
  "credentials": {
    "api_key": "sk-ant-api03-..."
  },
  "model_id": "claude-sonnet-4-5-20250929"
}
```

**Response:** Created configuration (201 Created)

### Update Configuration

```http
PUT /ai-providers/configurations/{config_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "model_id": "claude-opus-4-5-20251101",
  "credentials": {
    "api_key": "sk-ant-new-key..."
  }
}
```

### Delete Configuration

```http
DELETE /ai-providers/configurations/{config_id}
```

**Response:** 204 No Content

### Validate Configuration

```http
POST /ai-providers/configurations/{config_id}/validate
```

Tests the stored credentials against the provider's API.

**Response:**
```json
{
  "valid": true,
  "message": "Credentials validated successfully",
  "validated_at": "2026-01-15T10:30:00Z"
}
```

### Activate Configuration

```http
POST /ai-providers/configurations/{config_id}/activate
```

Sets this configuration as the active AI provider for the user.

**Response:**
```json
{
  "message": "Configuration activated",
  "config_id": "uuid",
  "provider": "anthropic",
  "model": "claude-sonnet-4-5-20250929"
}
```

### Deactivate Configuration

```http
POST /ai-providers/configurations/{config_id}/deactivate
```

**Response:**
```json
{
  "message": "Configuration deactivated",
  "config_id": "uuid"
}
```

### Get Provider Status

```http
GET /ai-providers/status
```

Returns the current AI provider status for the user.

**Response:**
```json
{
  "available": true,
  "provider": "anthropic",
  "model": "claude-sonnet-4-5-20250929",
  "dev_mode": false
}
```

### Supported Providers

| Provider Code | Auth Type | Description |
|--------------|-----------|-------------|
| `anthropic` | API Key | Claude Opus/Sonnet/Haiku 4.5 |
| `openai` | API Key | GPT-5 family |
| `together` | API Key | DeepSeek, Qwen, Llama 4, Mistral |
| `azure` | API Key + Config | Azure OpenAI Service |
| `bedrock` | IAM Credentials | AWS Bedrock models |
| `vertex` | Service Account | GCP Vertex AI models |

---

## Catalogs Router

Base path: `/api/v1/catalogs`

### List Catalogs

```http
GET /catalogs
```

**Response:**
```json
{
  "data": {
    "catalogs": [
      {
        "id": "uuid",
        "name": "Q4 Security Metrics",
        "description": "Custom catalog for Q4",
        "owner_id": "uuid",
        "is_active": true,
        "metric_count": 45,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Create Catalog

```http
POST /catalogs
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My Custom Catalog",
  "description": "Description of catalog"
}
```

**Response:** Created catalog object (201 Created)

### Get Catalog

```http
GET /catalogs/{catalog_id}
```

**Response:** Full catalog object with metrics

### Update Catalog

```http
PATCH /catalogs/{catalog_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Catalog

```http
DELETE /catalogs/{catalog_id}
```

**Response:** 204 No Content

### Activate Catalog

```http
POST /catalogs/{catalog_id}/activate
```

**Response:**
```json
{
  "data": {
    "message": "Catalog activated",
    "catalog_id": "uuid"
  }
}
```

### Get Active Catalog Metrics

```http
GET /catalogs/active/metrics
```

**Response:**
```json
{
  "data": {
    "catalog": {
      "id": "uuid",
      "name": "Active Catalog Name"
    },
    "metrics": [
      {
        "id": "uuid",
        "name": "Metric Name",
        "current_value": 85,
        "target_value": 95,
        "score": 89.5
      }
    ],
    "total": 45
  }
}
```

### Import Catalog Items

```http
POST /catalogs/{catalog_id}/import
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: CSV file
- `field_mapping`: JSON mapping object

**Response:**
```json
{
  "data": {
    "imported": 25,
    "skipped": 2,
    "errors": [
      {
        "row": 15,
        "error": "Missing required field: name"
      }
    ]
  }
}
```

---

## CSF Router

Base path: `/api/v1/csf`

### Get CSF Functions

```http
GET /csf/functions
```

**Response:**
```json
{
  "data": {
    "functions": [
      {
        "code": "GV",
        "name": "GOVERN",
        "description": "Establish and monitor..."
      }
    ]
  }
}
```

### Get CSF Categories

```http
GET /csf/categories
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `function` | string | Filter by function code |

**Response:**
```json
{
  "data": {
    "categories": [
      {
        "code": "PR.AA",
        "function_code": "PR",
        "name": "Identity Management...",
        "description": "Access to assets..."
      }
    ]
  }
}
```

### Get CSF Subcategories

```http
GET /csf/subcategories
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category code |

**Response:**
```json
{
  "data": {
    "subcategories": [
      {
        "code": "PR.AA-01",
        "category_code": "PR.AA",
        "description": "Identities and credentials..."
      }
    ]
  }
}
```

### Validate CSF Mapping

```http
POST /csf/validate
Content-Type: application/json
```

**Request Body:**
```json
{
  "function": "PROTECT",
  "category": "PR.AA"
}
```

**Response:**
```json
{
  "data": {
    "valid": true,
    "function": {
      "code": "PR",
      "name": "PROTECT"
    },
    "category": {
      "code": "PR.AA",
      "name": "Identity Management..."
    }
  }
}
```

---

## Frameworks Router

Base path: `/api/v1/frameworks`

### List Frameworks

```http
GET /frameworks
```

**Response:**
```json
{
  "data": {
    "frameworks": [
      {
        "id": "csf-2.0",
        "name": "NIST CSF 2.0",
        "version": "2.0",
        "function_count": 6,
        "category_count": 23
      },
      {
        "id": "ai-rmf-1.0",
        "name": "NIST AI RMF",
        "version": "1.0",
        "function_count": 4,
        "category_count": 16
      }
    ]
  }
}
```

### Get Framework

```http
GET /frameworks/{framework_id}
```

**Response:** Full framework object with functions and categories

### Get Framework Functions

```http
GET /frameworks/{framework_id}/functions
```

### Get Framework Categories

```http
GET /frameworks/{framework_id}/functions/{function_code}/categories
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Missing/invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_ERROR` | 502 | AI service error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Demo Router

Base path: `/api/v1/demo`

The demo router provides endpoints for demo session management and limited feature access. Demo mode allows users to try the application without full authentication.

### Create Demo Session

```http
POST /demo/session
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "id": "uuid",
  "session_id": "secure_token",
  "email": "user@example.com",
  "video_skipped": false,
  "demo_started_at": null,
  "demo_expires_at": null,
  "expired": false,
  "quotas": {
    "csf_metrics_created": 0,
    "csf_metrics_max": 2,
    "ai_rmf_metrics_created": 0,
    "ai_rmf_metrics_max": 2
  }
}
```

### Start Demo Session

```http
POST /demo/session/{session_id}/start
Content-Type: application/json
```

**Request Body:**
```json
{
  "video_skipped": false
}
```

Starts the 24-hour demo window and enables full demo access.

### Get Demo Metrics

```http
GET /demo/metrics?framework=csf_2_0
X-Demo-Session: {session_id}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `framework` | string | `csf_2_0` or `ai_rmf` |

Returns a limited set of metrics (1 per category) for the specified framework.

### Demo AI Chat Status

```http
GET /demo/ai/chat-status?framework=csf_2_0
X-Demo-Session: {session_id}
```

Returns available AI chat starters, refinement options, and quota status.

### Demo Guided Chat

```http
POST /demo/ai/guided-chat
X-Demo-Session: {session_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "starter_id": "csf-mfa",
  "framework": "csf_2_0",
  "refinement_id": "adjust-target-higher"
}
```

Security-hardened endpoint that only accepts pre-defined starter IDs (no free-form prompts).

### Demo AI Quota

```http
GET /demo/ai/quota
X-Demo-Session: {session_id}
```

Returns current AI metric creation quota (2 per framework).

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Standard endpoints | 100 req/min |
| AI endpoints | 20 req/min |
| Export endpoints | 10 req/min |
| Demo endpoints | 30 req/min |

Rate limit headers included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

**Next:** [Database Schema](database-schema.md) - Understand the data model
