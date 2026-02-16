# MetricFrame - AI & Cyber Risk Metrics

A free, open source application for managing and visualizing cybersecurity Key Risk Indicators (KRIs) aligned with **NIST Cybersecurity Framework 2.0** and **NIST AI Risk Management Framework 1.0**.

## Overview

MetricFrame provides:

- **Multi-Framework Support**: Unified dashboard for NIST CSF 2.0 (cybersecurity) and AI RMF 1.0 (AI risk)
- **Executive Dashboard**: Color-coded risk scores across all framework functions
- **Metrics Catalog**: 356 pre-configured metrics with risk definitions and gap-to-target scoring
- **AI Assistant**: Intelligent metrics management powered by your own API key (6 providers supported)
- **100% Local**: Runs entirely on your infrastructure - your data never leaves your systems

## Download

### Desktop App (Coming Soon)

A standalone desktop application with one-click installation is currently in development. It will be available for macOS, Windows, and Linux when released.

### Docker (Recommended)

```bash
# Quick start (review script first, then run)
curl -fsSL https://get.metricframe.ai/install.sh -o install.sh
less install.sh
chmod +x install.sh && ./install.sh

# Or direct execution (for trusted environments)
curl -fsSL https://get.metricframe.ai/install.sh | bash
```

## Requirements

### Bring Your Own API Key

MetricFrame requires your own AI API key for the AI assistant features. Choose from 6 supported providers:

| Provider | Models | Get API Key |
|----------|--------|-------------|
| **Anthropic** | Claude Opus 4.5, Sonnet 4.5, Haiku 4.5 | [console.anthropic.com](https://console.anthropic.com/account/keys) |
| **OpenAI** | GPT-5.2, GPT-5.1, GPT-5, GPT-5 Mini, GPT-5 Pro | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Together.ai** | DeepSeek-V3.1, DeepSeek-R1, Qwen3, Llama 4, Mistral | [api.together.xyz](https://api.together.xyz/) |
| **Azure AI Foundry** | GPT-5.2, GPT-5, DeepSeek-R1, Llama 4, Mistral Large 3 | [ai.azure.com](https://ai.azure.com/) |
| **AWS Bedrock** | Claude 4.5, Amazon Nova, Llama 4, DeepSeek-R1, Qwen3 | [aws.amazon.com](https://aws.amazon.com/bedrock/) |
| **GCP Vertex AI** | Gemini 3, Gemini 2.5, Claude 4.5, Llama 4, DeepSeek-R1 | [cloud.google.com](https://cloud.google.com/vertex-ai) |

Your API keys are stored locally and encrypted. We never see your keys or your data.

> **Note**: You can use MetricFrame without an API key, but AI features (metric generation, explanations, recommendations) will be disabled.

## Supported Frameworks

| Framework | Functions | Metrics |
|-----------|-----------|---------|
| **NIST CSF 2.0** | Govern, Identify, Protect, Detect, Respond, Recover | 276 |
| **NIST AI RMF 1.0** | Govern, Map, Measure, Manage | 80 |

## Features

### User Interface
- **Light/Dark Mode**: Toggle between light and dark themes (light mode default)
- **Theme-Aware Components**: All views optimized for both light and dark modes
- **Responsive Design**: Works on desktop and tablet displays

### Executive Dashboard
- **Function Scores**: Performance metrics for each framework function
- **Risk Ratings**: Color-coded Low/Moderate/Elevated/High risk levels
- **Attention Metrics**: Top metrics requiring immediate focus
- **Catalog Switching**: Toggle between default and custom metrics catalogs
- **Drill-Down Navigation**: Click functions → categories → individual metrics

### Category Detail View
- **Category Breakdown**: View all metrics within a specific category
- **Score Distribution**: Horizontal bar charts showing metric performance
- **Gap-to-Target Charts**: Visual gap analysis for each metric
- **Trend Visualization**: Historical trends with 7/30/90 day toggles
- **Auto-Generated Insights**: AI-analyzed highest gaps and quick wins
- **Search & Filter**: Filter by priority, search by name, with URL persistence
- **Reset Filters**: One-click reset of all active filters

### Bring Your Own Catalog
- **Custom Metrics Import**: Upload CSV files with your organization's metrics
- **AI-Powered CSF Mapping**: Automatic suggestions for mapping to NIST frameworks
- **Flexible Field Mapping**: Map your columns to standard metric fields
- **Multi-Catalog Support**: Switch between different metrics catalogs

### Scoring Methodology
- **Gap-to-Target**: Transparent calculation based on current vs target values
- **Weighted Aggregation**: Priority-based weighting (High=1.0, Medium=0.6, Low=0.3)
- **Multiple Directions**: Higher-is-better, lower-is-better, target-range, binary
- **Configurable Thresholds**: Customizable risk rating boundaries

### Metrics Catalog Grid
- **Dashboard Navigation**: One-click navigation from metrics to category dashboard
- **Inline Editing**: Edit metric values directly with validation
- **Value Validation**: Prevents unrealistic values (>150% for percentages, >10x target)
- **Lock Protection**: Lock metrics to prevent accidental edits
- **Version History**: Track all changes with diff comparison
- **Business Impact**: See why each metric matters to the business

### AI-Powered Metrics Management
- **Natural Language**: "Add a metric for board cyber briefings"
- **Context Awareness**: Understands existing metrics to avoid duplication
- **Review Process**: Human approval required before applying changes
- **6 AI Providers**: Anthropic, OpenAI, Together.ai, Azure, AWS Bedrock, GCP Vertex
- **Role-Based AI Access**:
  - **Editors/Admins**: Full access to all AI features including metric creation and modification
  - **Viewers**: Read-only AI access for explanations, reports, and gap analysis visualization

### User Management & Access Control
- **Role-Based Access**: Three roles (Admin, Editor, Viewer) with granular permissions
- **First-Time Setup**: First user becomes Admin with recovery key
- **User Invitations**: Admins invite users via email with role assignment
- **Password Recovery**: Dual recovery options (recovery key or security questions)
- **Account Management**: Activate/deactivate users, change roles, reset passwords
- **AI Assistant Access**: All roles can access AI Assistant - Viewers get read-only mode for explanations and reports

## Architecture

```
Docker Deployment:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React + TS    │    │   FastAPI + PY   │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend        │◄──►│   Database      │
│   (nginx)       │    │   (uvicorn x4)   │    │                 │
└─────────────────┘    └────────┬─────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (sessions)    │
                       └─────────────────┘
```

## Development

### Prerequisites
- Docker & Docker Compose (for Docker deployment)
- Node.js 18+ and Python 3.11+ (for local development)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/automationacct01/metric_frame.git
cd metric_frame

# Start with Docker (recommended)
docker compose up -d

# Access the app at http://localhost:5175
# Configure AI API keys in Settings > AI Configuration
```

### Access Points

**Production (Docker):**
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/v1/docs

**Development:**
- **Frontend**: http://localhost:5175
- **API Documentation**: http://localhost:8002/docs
- **Health Check**: http://localhost:8002/health

## Configuration

### Environment Variables

```env
# Database (PostgreSQL for Docker, SQLite for Desktop)
DATABASE_URL=postgresql://metricframe:metricframe@localhost:5432/metricframe

# Session Storage (Redis for multi-worker production)
REDIS_URL=redis://redis:6379/0
SESSION_TTL_HOURS=24

# Encryption key for AI credentials stored in-app (generate your own)
AI_CREDENTIALS_MASTER_KEY=  # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> **Note**: AI provider API keys are configured through the in-app **Settings > AI Configuration** page, not via environment variables. Keys are encrypted at rest using the master key above.

## Documentation

- [Authentication & User Management](docs/AUTHENTICATION.md) - Roles, permissions, password recovery
- [Frameworks Guide](docs/frameworks-guide.md) - Learn about NIST CSF 2.0 and AI RMF 1.0
- [Scoring Methodology](docs/scoring-method.md) - How scores are calculated
- [AI RMF Support](docs/ai-rmf-support.md) - AI Risk Management Framework details
- [Catalog Import Guide](docs/catalog-import-guide.md) - Import your own metrics
- [Code Signing Guide](docs/CODE_SIGNING.md) - For building signed releases

## Security

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR COMPUTER (localhost)                                  │
│                                                             │
│  Browser ──HTTP──► Frontend ──HTTP──► Backend               │
│  (localhost:3000)   (nginx)          (FastAPI)              │
│                                           │                 │
└───────────────────────────────────────────│─────────────────┘
                                            │
                                            ▼ HTTPS (TLS encrypted)
                                    ┌───────────────────┐
                                    │   AI APIs         │
                                    │   (encrypted)     │
                                    └───────────────────┘
```

**Key Security Points:**
- **Local traffic stays local**: Browser-to-app communication never leaves your computer
- **AI API calls are encrypted**: All outbound connections use HTTPS/TLS
- **Port 3000**: Non-privileged port, industry standard for web apps

### Data Protection

- **100% Local**: No data ever leaves your infrastructure (except encrypted AI API calls)
- **Role-Based Access Control**: Admin, Editor, and Viewer roles with enforced permissions
- **Encrypted Credentials**: API keys stored with Fernet encryption
- **Password Recovery**: Recovery key + security questions for account recovery
- **Open Source**: Full code transparency - audit it yourself
- **No Telemetry**: We don't track usage or collect any data

### Docker Security

| Aspect | Details |
|--------|---------|
| Session Storage | Redis (multi-worker support) |
| Database | PostgreSQL with encrypted credentials |
| Multi-user | Yes, with role-based access control |
| Network | Configurable, localhost by default |

See the [Security Documentation](wiki/security.md) for detailed architecture information.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/automationacct01/metric_frame/issues)
- **Documentation**: Check the `/docs` folder for detailed guides

---

Built with care for cybersecurity professionals using NIST frameworks.
