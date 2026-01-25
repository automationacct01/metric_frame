# Getting Started

> **Last Updated:** January 2026
> **Status:** Active Development

---

Get MetricFrame running locally in 5 minutes.

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Git | 2.30+ | Repository cloning |

Optional (for AI features):
- Anthropic API key (Claude integration)
- OpenAI API key (GPT fallback)

## Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/metricframe.git
cd metricframe
```

### Step 2: Configure Environment

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
# Database (default works with Docker)
DATABASE_URL=postgresql://postgres:postgres@db:5432/metricframe

# AI Integration (optional but recommended)
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Application Settings
DEBUG=true
LOG_LEVEL=INFO
```

### Step 3: Start the Application

```bash
./dev.sh
```

This script will:
1. Build Docker containers
2. Start PostgreSQL database
3. Run database migrations
4. Seed 356 pre-configured metrics
5. Launch frontend and backend services

### Step 4: Verify Installation

Wait for containers to start (usually 30-60 seconds), then verify:

```bash
# Check running containers
docker compose ps

# Expected output:
# NAME                    STATUS
# metricframe-db   running
# metricframe-api  running
# metricframe-web  running
```

### Step 5: Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Landing Page** | http://localhost:5173 | Marketing & entry point |
| **Main App** | http://localhost:5173/app | Dashboard & full features |
| **Demo Mode** | http://localhost:5173/demo | Try features without setup |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **Database** | localhost:5432 | PostgreSQL (user: postgres) |

## First Steps After Setup

### 1. Try Demo Mode (Quick Preview)

Visit http://localhost:5173/demo to experience the application without configuration:
- Enter any email to start a demo session
- Explore the dashboard with simulated data
- Test AI features with limited quota
- No API keys required

### 2. Explore the Full Dashboard

Navigate to http://localhost:5173/app to see the executive dashboard:
- View risk score cards for each CSF function
- Explore the pre-loaded 356 metrics
- Check framework coverage visualization

### 3. Review Pre-Loaded Metrics

The application seeds 276 CSF 2.0 metrics distributed across functions:

| Function | Metrics | Examples |
|----------|---------|----------|
| GOVERN | 35 | Board briefings, policy compliance |
| IDENTIFY | 34 | Asset inventory, vulnerability scanning |
| PROTECT | 44 | MFA adoption, patching cadence |
| DETECT | 30 | MTTD, monitoring coverage |
| RESPOND | 28 | MTTR, incident containment |
| RECOVER | 28 | RTO achievement, backup success |

### 4. Try the AI Assistant

If you configured API keys, test the AI assistant:
1. Click the AI Chat icon
2. Try: "Create a metric for tracking phishing test click rates"
3. Review the generated metric structure

### 5. Import Custom Metrics

Use the Catalog Manager to import your own metrics:
1. Navigate to Catalogs > Import
2. Follow the 5-step wizard
3. Map fields and CSF categories
4. Activate your catalog

## Environment Configuration Reference

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude AI integration | None |
| `OPENAI_API_KEY` | GPT fallback | None |
| `DEBUG` | Enable debug mode | false |
| `LOG_LEVEL` | Logging verbosity | INFO |
| `CORS_ORIGINS` | Allowed frontend origins | http://localhost:5173 |

### Scoring Thresholds

Customize risk rating thresholds:

| Variable | Description | Default |
|----------|-------------|---------|
| `SCORE_VERY_LOW_THRESHOLD` | Very Low risk minimum | 90 |
| `SCORE_LOW_THRESHOLD` | Low risk minimum | 75 |
| `SCORE_MODERATE_THRESHOLD` | Moderate risk minimum | 60 |
| `SCORE_ELEVATED_THRESHOLD` | Elevated risk minimum | 40 |

## Seed Data

The application includes comprehensive seed data:

### Metrics Seed (`backend/src/seeds/`)
- 356 pre-configured KRIs (276 CSF 2.0 + 80 AI RMF)
- Aligned to NIST CSF 2.0 categories
- Includes targets, directions, and priorities
- Realistic current values for demonstration

### Framework Reference Data
- Complete NIST CSF 2.0 hierarchy
- AI RMF 1.0 functions and characteristics
- Cyber AI Profile mappings

## Stopping the Application

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v
```

## Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker compose build

# Restart with migrations
./dev.sh
```

## Next Steps

| Guide | Description |
|-------|-------------|
| [How It Works](how-it-works.md) | Understand the architecture |
| [Dashboard Guide](dashboard.md) | Master the executive dashboard |
| [Metrics Management](metrics-management.md) | Learn to manage KRIs |
| [AI Assistant](ai-assistant.md) | Leverage AI capabilities |

---

**Troubleshooting?** See [Troubleshooting Guide](troubleshooting.md) for common issues.
