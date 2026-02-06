# MetricFrame

> **Last Updated:** February 2026
> **Status:** Active Development

---

## What is MetricFrame?

MetricFrame is a comprehensive web application for managing and visualizing cybersecurity Key Risk Indicators (KRIs) aligned with multiple security frameworks including NIST CSF 2.0, AI RMF, and the Cyber AI Profile. The application provides executive dashboards, AI-powered metrics management, and transparent risk scoring.

## Key Highlights

| Feature | Description |
|---------|-------------|
| **356 Pre-Configured Metrics** | 276 CSF 2.0 + 80 AI RMF metrics |
| **Multi-Framework Support** | NIST CSF 2.0 and AI RMF 1.0 with unified dashboard |
| **10 Framework Functions** | 6 CSF + 4 AI RMF functions |
| **7 AI Trustworthiness Types** | Track AI system trustworthiness characteristics |
| **AI Integration** | 6 provider options for metrics creation and analysis |
| **Bring Your Own Catalog** | Import and manage custom metric catalogs |
| **Gap-to-Target Scoring** | Transparent weighted risk calculations |
| **Executive Dashboard** | Red/Amber/Green risk visualization |
| **Light/Dark Mode** | Toggle between themes (light mode default) |
| **Column Tooltips** | Hover over any column header for field explanations |

## How It Works

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   React Frontend  |<--->|  FastAPI Backend  |<--->|   PostgreSQL DB   |
|   Material-UI     |     |  SQLAlchemy ORM   |     |   356 Metrics     |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
         |                        |
         |                        v
         |               +-------------------+
         |               |                   |
         +-------------->|   AI Assistant    |
                         |  6 AI Providers   |
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
| **NIST CSF 2.0** | Govern, Identify, Protect, Detect, Respond, Recover | 276 | Cybersecurity risk |
| **NIST AI RMF 1.0** | Govern, Map, Measure, Manage | 80 | AI trustworthiness |

See [Frameworks Reference](frameworks-reference.md) for detailed information about each framework.

## Current Status

The application is under active development with the following features implemented:

- Executive risk dashboard with color-coded risk scoring
- **Drill-down navigation**: Dashboard → Function → Category → Metrics
- **Category Detail view** with insights, trends, and visualizations
- Complete metrics CRUD operations with **value validation**
- Multi-framework support (CSF 2.0 and AI RMF 1.0)
- Multi-catalog support (BYOC)
- 5-step catalog import wizard
- AI-powered metrics creation and enhancement (6 AI providers)
- Framework-specific scoring and views
- CSV import/export functionality
- Column tooltips for all metrics fields
- **Metric version history** with diff comparison
- **Dashboard navigation** from Metrics Catalog
- **Search/filter persistence** via URL parameters

## Dashboard Sections

| Section | Purpose |
|---------|---------|
| **Score Cards** | Function-level risk scores with Red/Amber/Green coloring |
| **Function Detail** | Category breakdown within a function (click score card) |
| **Category Detail** | Metric-level view with trends and insights (click category) |
| **CSF Coverage** | Visual coverage map across framework categories |
| **Metrics Grid** | Filterable table with dashboard navigation and validation |
| **AI Chat** | Natural language metrics assistant |
| **Catalog Manager** | Custom catalog administration |
| **Demo Mode** | Try features with simulated data (access via `/demo`) |

## Quick Links

| Documentation | Description |
|---------------|-------------|
| [Getting Started](getting-started.md) | Quick setup guide (5 minutes) |
| [Security](security.md) | Network architecture and data privacy |
| [Demo Mode](demo-mode.md) | Try features without configuration |
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
| AI | 6 providers: Anthropic, OpenAI, Together.ai, Azure, Bedrock, Vertex |
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
