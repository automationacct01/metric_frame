# API Reference

> **Last Updated:** January 2026
> **Status:** Active Development

---

Complete REST API documentation for MetricFrame backend services.

## Base URL

```
http://localhost:8000/api/v1
```

Production deployments should use HTTPS.

## Authentication

API authentication via header:

```http
Authorization: Bearer <api_key>
```

For local development, authentication may be disabled.

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
    "total": 208,
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
        "metric_count": 35,
        "trend": "up"
      },
      {
        "code": "ID",
        "name": "IDENTIFY",
        "score": 65.0,
        "rating": "Moderate",
        "metric_count": 34,
        "trend": "stable"
      }
    ],
    "catalog": {
      "id": "uuid",
      "name": "Default Catalog",
      "metric_count": 208
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

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Standard endpoints | 100 req/min |
| AI endpoints | 20 req/min |
| Export endpoints | 10 req/min |

Rate limit headers included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

**Next:** [Database Schema](database-schema.md) - Understand the data model
