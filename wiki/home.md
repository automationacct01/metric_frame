# MetricFrame

> **Last Updated:** January 2026
> **Status:** Active Development

---

## What is MetricFrame?

MetricFrame is a comprehensive web application for managing and visualizing cybersecurity Key Risk Indicators (KRIs) aligned with multiple security frameworks including NIST CSF 2.0, AI RMF, and the Cyber AI Profile. The application provides executive dashboards, AI-powered metrics management, and transparent risk scoring.

## Key Highlights

| Feature | Description |
|---------|-------------|
| **226 Pre-Configured Metrics** | 208 CSF 2.0 + 18 AI RMF metrics |
| **Multi-Framework Support** | NIST CSF 2.0 and AI RMF 1.0 with unified dashboard |
| **10 Framework Functions** | 6 CSF + 4 AI RMF functions |
| **7 AI Trustworthiness Types** | Track AI system trustworthiness characteristics |
| **AI Integration** | Claude-powered metrics creation and analysis |
| **Bring Your Own Catalog** | Import and manage custom metric catalogs |
| **Gap-to-Target Scoring** | Transparent weighted risk calculations |
| **Executive Dashboard** | RAG-colored risk visualization |
| **Column Tooltips** | Hover over any column header for field explanations |

## How It Works

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   React Frontend  |<--->|  FastAPI Backend  |<--->|   PostgreSQL DB   |
|   Material-UI     |     |  SQLAlchemy ORM   |     |   208 Metrics     |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
         |                        |
         |                        v
         |               +-------------------+
         |               |                   |
         +-------------->|   AI Assistant    |
                         |   Claude Sonnet   |
                         |                   |
                         +-------------------+
```

**Data Flow:**
1. Users interact with the React dashboard
2. API requests flow to FastAPI backend
3. Backend queries PostgreSQL for metrics data
4. Scoring engine calculates risk scores
5. AI assistant provides intelligent analysis
6. Results render in executive dashboard

## Supported Frameworks

| Framework | Functions | Metrics | Focus |
|-----------|-----------|---------|-------|
| **NIST CSF 2.0** | Govern, Identify, Protect, Detect, Respond, Recover | 208 | Cybersecurity risk |
| **NIST AI RMF 1.0** | Govern, Map, Measure, Manage | 18 | AI trustworthiness |

See [Frameworks Reference](frameworks-reference.md) for detailed information about each framework.

## Current Status

The application is under active development with the following features implemented:

- Executive risk dashboard with RAG scoring
- Complete metrics CRUD operations
- Multi-framework support (CSF 2.0 and AI RMF 1.0)
- Multi-catalog support (BYOC)
- 5-step catalog import wizard
- AI-powered metrics creation and enhancement
- Framework-specific scoring and views
- CSV import/export functionality
- Column tooltips for all metrics fields

## Dashboard Sections

| Section | Purpose |
|---------|---------|
| **Score Cards** | Function-level risk scores with RAG coloring |
| **CSF Coverage** | Visual coverage map across framework categories |
| **Metrics Grid** | Filterable table of all KRIs |
| **AI Chat** | Natural language metrics assistant |
| **Catalog Manager** | Custom catalog administration |

## Quick Links

| Documentation | Description |
|---------------|-------------|
| [Getting Started](getting-started.md) | Quick setup guide (5 minutes) |
| [How It Works](how-it-works.md) | System architecture overview |
| [Dashboard Guide](dashboard.md) | Executive dashboard features |
| [Metrics Management](metrics-management.md) | Working with KRIs |
| [AI Assistant](ai-assistant.md) | AI integration guide |
| [Scoring Methodology](scoring-methodology.md) | Risk calculation algorithms |
| [Frameworks Reference](frameworks-reference.md) | NIST CSF 2.0, AI RMF, Cyber AI Profile |
| [API Reference](api-reference.md) | REST API documentation |
| [Database Schema](database-schema.md) | Data models and relationships |
| [Development Guide](development-guide.md) | Contributing and local setup |
| [Troubleshooting](troubleshooting.md) | Common issues and solutions |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Material-UI, Vite |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL 15 |
| AI | Anthropic Claude Sonnet |
| Deployment | Docker Compose |

## Repository Structure

```
metricframe/
├── backend/           # FastAPI application
│   ├── src/
│   │   ├── routers/   # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── models.py  # Database models
│   │   └── schemas.py # Pydantic schemas
│   └── alembic/       # Database migrations
├── frontend/          # React application
│   └── src/
│       ├── components/
│       ├── api/
│       └── types/
├── docker/            # Container configs
├── docs/              # Additional docs
└── wiki/              # This documentation
```

---

**Next:** [Getting Started](getting-started.md) - Set up the application in 5 minutes
