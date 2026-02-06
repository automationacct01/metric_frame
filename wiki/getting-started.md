# Getting Started

> **Last Updated:** February 2026
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
- Bring your own API key with 6 provider options available in AI configuration settings

## Quick Start

### Step 1: Install MetricFrame

```bash
# Quick start (review script first, then run)
curl -fsSL https://get.metricframe.ai/install.sh -o install.sh
less install.sh  # Review the script
chmod +x install.sh && ./install.sh
```

The installer will:
1. Check Docker is installed and running
2. Download `docker-compose.yml` with SHA256 verification
3. Generate a secure `.env` with random database credentials
4. Pull Docker images and start MetricFrame

**Note:** AI provider configuration is done through the app's Settings → AI Configuration page, where you can bring your own API key and choose from 6 provider options.

### Step 3: Start the Application

```bash
./dev.sh
```

This script will:
1. Build Docker containers
2. Start PostgreSQL database and Redis session store
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
# metricframe-db     running (healthy)
# metricframe-redis  running (healthy)
# metricframe-api    running (healthy)
# metricframe-web    running (healthy)
```

### Step 5: Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Landing Page** | http://localhost:3000 | Marketing & entry point |
| **Main App** | http://localhost:3000/app | Dashboard & full features |
| **API Docs** | http://localhost:8002/docs | Swagger UI (dev mode) |
| **Database** | localhost:5434 | PostgreSQL (dev mode only) |

> **Note:** Port 3000 is used for production Docker deployment. Development mode uses port 5175. See [Security](security.md) for details on why these ports were chosen.

## First Steps After Setup

### 1. Register Your Admin Account

On first launch, you'll be prompted to create the admin account:

1. Enter your **name**, **email**, and **password**
2. Select and answer **two security questions** (for password recovery)
3. Click **Register**
4. **Important:** Save the displayed **Recovery Key** - it's shown only once!

For details on user management, see [User Management](user-management).

### 2. Explore the Dashboard

Navigate to http://localhost:3000/app to see the executive dashboard:
- View risk score cards for each CSF function
- Explore the pre-loaded 356 metrics
- Check framework coverage visualization
- Toggle light/dark mode via Settings (light mode is the default)

### 3. Review Pre-Loaded Metrics

The application seeds 356 metrics (276 CSF 2.0 + 80 AI RMF) distributed across functions:

| Function | Metrics | Examples |
|----------|---------|----------|
| GOVERN | 48 | Board briefings, policy compliance, AI governance |
| IDENTIFY | 47 | Asset inventory, vulnerability scanning, AI asset mapping |
| PROTECT | 56 | MFA adoption, patching cadence, AI safeguards |
| DETECT | 44 | MTTD, monitoring coverage, AI anomaly detection |
| RESPOND | 42 | MTTR, incident containment, AI incident response |
| RECOVER | 39 | RTO achievement, backup success, AI recovery |

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
| `AI_API_KEY` | API key for AI provider (configured in settings) | None |
| `DEBUG` | Enable debug mode | false |
| `LOG_LEVEL` | Logging verbosity | INFO |
| `CORS_ORIGINS` | Allowed frontend origins | http://localhost:5175 |
| `REDIS_URL` | Redis connection for session storage | None (uses in-memory) |
| `SESSION_TTL_HOURS` | Session expiration time | 24 |

### Scoring Thresholds

Customize risk rating thresholds:

| Variable | Description | Default |
|----------|-------------|---------|
| `RISK_THRESHOLD_VERY_LOW` | Very Low risk minimum | 90 |
| `RISK_THRESHOLD_LOW` | Low risk minimum | 75 |
| `RISK_THRESHOLD_MEDIUM` | Medium risk minimum | 50 |
| `RISK_THRESHOLD_HIGH` | High risk minimum | 30 |

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
