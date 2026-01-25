# How It Works

> **Last Updated:** January 2026
> **Status:** Active Development

---

A technical overview of MetricFrame's architecture, data flow, and component interactions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │ MetricsGrid │  │  AI Chat    │  │  Catalog    │        │
│  │  ScoreCards │  │  CRUD Ops   │  │  Assistant  │  │  Manager    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND (Vite)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API Client (axios)  │  State Management  │  Material-UI Components │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                            HTTP/REST API
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           API ROUTERS                                 │  │
│  │  /metrics  │  /scores  │  /ai  │  /catalogs  │  /csf  │  /frameworks │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         SERVICES LAYER                                │  │
│  │  ScoringService  │  AIClient  │  CatalogScoring  │  CSFReference     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       SQLAlchemy ORM                                  │  │
│  │  Models: metrics, catalogs, scores, frameworks, users                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                    │
          ▼                                                    ▼
┌─────────────────────┐                          ┌─────────────────────────┐
│    PostgreSQL DB    │                          │    AI Services          │
│  ┌───────────────┐  │                          │  ┌───────────────────┐  │
│  │ 356 Metrics   │  │                          │  │ Anthropic Claude  │  │
│  │ Catalogs      │  │                          │  │ (Primary)         │  │
│  │ Scores        │  │                          │  ├───────────────────┤  │
│  │ Frameworks    │  │                          │  │ OpenAI GPT        │  │
│  │ History       │  │                          │  │ (Fallback)        │  │
│  └───────────────┘  │                          │  └───────────────────┘  │
└─────────────────────┘                          └─────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18.x | UI framework |
| | TypeScript | 5.x | Type safety |
| | Material-UI | 5.x | Component library |
| | Vite | 5.x | Build tooling |
| | Axios | 1.x | HTTP client |
| **Backend** | FastAPI | 0.100+ | API framework |
| | SQLAlchemy | 2.x | ORM |
| | Pydantic | 2.x | Data validation |
| | Alembic | 1.x | Migrations |
| | Poetry | 1.x | Dependencies |
| **Database** | PostgreSQL | 15.x | Primary data store |
| **AI** | Anthropic Claude | Sonnet | Primary AI |
| | OpenAI GPT | 4o | Fallback AI |
| **Infrastructure** | Docker | 24.x | Containerization |
| | Docker Compose | 2.x | Orchestration |

## Request Lifecycle

### 1. Dashboard Load Flow

```
User opens dashboard
        │
        ▼
Frontend requests /scores/overview
        │
        ▼
Backend ScoringService calculates:
  1. Get active catalog (or default metrics)
  2. Fetch all metrics with current values
  3. Calculate individual metric scores
  4. Aggregate by CSF category
  5. Aggregate by CSF function
  6. Apply risk rating thresholds
        │
        ▼
Response: Function scores + category breakdowns
        │
        ▼
Frontend renders ScoreCards with Red/Amber/Green colors
```

### 2. Metric Creation Flow

```
User enters metric in AI Chat
        │
        ▼
Frontend POST /ai/chat
  { mode: "metrics", prompt: "..." }
        │
        ▼
Backend AIClient:
  1. Build system prompt
  2. Call Claude API
  3. Parse structured response
  4. Validate against schemas
        │
        ▼
AI returns metric structure:
  { name, description, target, direction, csf_function, ... }
        │
        ▼
User confirms creation
        │
        ▼
Frontend POST /metrics
        │
        ▼
Backend creates metric + audit log
        │
        ▼
Scores recalculate on next dashboard load
```

### 3. Catalog Import Flow

```
User uploads CSV in Catalog Wizard
        │
        ▼
Step 1: Parse CSV, extract columns
        │
        ▼
Step 2: User maps CSV columns to metric fields
        │
        ▼
Step 3: AI suggests CSF mappings for each metric
  POST /ai/chat { mode: "catalog-mapping", metrics: [...] }
        │
        ▼
Step 4: AI suggests enhancements
  POST /ai/enhance { catalog_items: [...] }
        │
        ▼
Step 5: User activates catalog
  POST /catalogs/{id}/activate
        │
        ▼
Dashboard now uses custom catalog for scoring
```

## Component Interactions

### Frontend Components

```
App.tsx
├── Dashboard.tsx
│   ├── ScoreCard.tsx (x6 - one per CSF function)
│   ├── CSFCoverageView.tsx
│   └── MetricsNeedingAttention.tsx
├── MetricsGrid.tsx
│   ├── MetricRow.tsx
│   ├── MetricEditor.tsx
│   └── MetricFilters.tsx
├── AIChat.tsx
│   ├── ChatMessage.tsx
│   └── ChatInput.tsx
└── CatalogManager.tsx
    ├── CatalogList.tsx
    └── CatalogWizard.tsx (5 steps)
```

### Backend Routers

| Router | Base Path | Responsibilities |
|--------|-----------|------------------|
| `metrics` | `/api/v1/metrics` | CRUD operations, CSV export |
| `scores` | `/api/v1/scores` | Score calculations, aggregations |
| `ai` | `/api/v1/ai` | Chat modes, enhancements |
| `catalogs` | `/api/v1/catalogs` | Catalog CRUD, activation |
| `csf` | `/api/v1/csf` | Framework reference data |
| `frameworks` | `/api/v1/frameworks` | Multi-framework support |

### Services Layer

| Service | File | Purpose |
|---------|------|---------|
| `ScoringService` | `scoring.py` | Gap-to-target calculations |
| `AIClient` | `ai_client.py` | Claude/GPT integration |
| `CatalogScoring` | `catalog_scoring.py` | Catalog-aware aggregation |
| `CSFReference` | `csf_reference.py` | Framework hierarchy |

## Multi-Framework Support

The application supports three security frameworks:

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│  Framework                                                       │
│    └── Functions                                                │
│          └── Categories                                         │
│                └── Subcategories                                │
│                      └── Metrics                                │
└─────────────────────────────────────────────────────────────────┘

NIST CSF 2.0                 AI RMF 1.0              Cyber AI Profile
├── GOVERN (GV)              ├── GOVERN              ├── Extended CSF
├── IDENTIFY (ID)            ├── MAP                 │   with AI
├── PROTECT (PR)             ├── MEASURE             │   considerations
├── DETECT (DE)              └── MANAGE              └── AI-specific
├── RESPOND (RS)                                         controls
└── RECOVER (RC)
```

### Framework Selection

Users can switch frameworks in the dashboard:
1. Dropdown selector in header
2. API loads framework-specific functions/categories
3. Metrics filtered to active framework
4. Scores recalculate for selected framework

## Data Model Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   frameworks    │     │    catalogs     │     │     users       │
│  ─────────────  │     │  ─────────────  │     │  ─────────────  │
│  id             │     │  id             │     │  id             │
│  name           │     │  name           │     │  username       │
│  version        │     │  owner_id       │────▶│  active_catalog │
└────────┬────────┘     │  is_active      │     └─────────────────┘
         │              └────────┬────────┘
         ▼                       │
┌─────────────────┐              ▼
│   functions     │     ┌─────────────────┐
│  ─────────────  │     │ catalog_items   │
│  id             │     │  ─────────────  │
│  code (GV, ID)  │     │  id             │
│  framework_id   │     │  catalog_id     │
└────────┬────────┘     │  metric_data    │
         │              │  csf_mappings   │
         ▼              └─────────────────┘
┌─────────────────┐
│   categories    │     ┌─────────────────┐
│  ─────────────  │     │    metrics      │
│  id             │     │  ─────────────  │
│  code (GV.OC)   │     │  id             │
│  function_id    │     │  name           │
└────────┬────────┘     │  current_value  │
         │              │  target_value   │
         ▼              │  csf_category   │
┌─────────────────┐     │  priority       │
│  subcategories  │     └─────────────────┘
│  ─────────────  │
│  id             │
│  code           │
│  category_id    │
└─────────────────┘
```

## Scoring Pipeline

```
Individual Metrics
        │
        ▼
┌─────────────────────────────────────┐
│  Gap-to-Target Score Calculation    │
│  score = f(current, target, dir)    │
│  Apply direction logic              │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Priority Weighting                  │
│  High: 1.0, Medium: 0.6, Low: 0.3   │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Category Aggregation                │
│  weighted_avg(metrics in category)   │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Function Aggregation                │
│  weighted_avg(categories in func)    │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Risk Rating                         │
│  Very Low (90+) → Very High (<40)   │
└─────────────────────────────────────┘
```

## Security Considerations

| Area | Implementation |
|------|----------------|
| **API Authentication** | API key in headers |
| **Database Connections** | Connection pooling, SSL |
| **AI API Keys** | Environment variables, never logged |
| **CORS** | Configured allowed origins |
| **Input Validation** | Pydantic schemas on all endpoints |

## Performance Optimizations

| Optimization | Description |
|--------------|-------------|
| **Database Indices** | On `catalog_id`, `csf_category`, `created_at` |
| **Lazy Loading** | Metrics loaded on demand |
| **Caching** | Framework reference data cached |
| **Batch Operations** | Bulk imports processed in transactions |

---

**Next:** [Dashboard Guide](dashboard.md) - Learn to use the executive dashboard
