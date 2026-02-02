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

### Desktop App (Recommended for most users)

One-click installation, no technical setup required:

- **macOS**: [Download .dmg](https://github.com/automationacct01/metric_frame/releases/latest)
- **Windows**: [Download .exe](https://github.com/automationacct01/metric_frame/releases/latest)
- **Linux**: [Download .AppImage](https://github.com/automationacct01/metric_frame/releases/latest)

### Docker (For servers and teams)

```bash
# Quick start
curl -fsSL https://raw.githubusercontent.com/automationacct01/metric_frame/main/quickstart.sh | bash

# Or with Docker Compose
git clone https://github.com/automationacct01/metric_frame.git
cd metric_frame
docker compose -f docker-compose.prod.yml up -d
```

## Requirements

### Bring Your Own API Key

MetricFrame requires your own AI API key for the AI assistant features. Choose from 6 supported providers:

| Provider | Models | Get API Key |
|----------|--------|-------------|
| **Anthropic** | Claude Opus, Sonnet, Haiku | [console.anthropic.com](https://console.anthropic.com/account/keys) |
| **OpenAI** | GPT-4o, GPT-4, GPT-3.5 | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Together.ai** | DeepSeek, Llama, Mistral | [api.together.xyz](https://api.together.xyz/) |
| **Azure OpenAI** | GPT-4, GPT-3.5 (Enterprise) | [azure.microsoft.com](https://azure.microsoft.com/en-us/products/ai-services/openai-service) |
| **AWS Bedrock** | Claude, Llama, Amazon Nova | [aws.amazon.com](https://aws.amazon.com/bedrock/) |
| **GCP Vertex AI** | Gemini, Claude | [cloud.google.com](https://cloud.google.com/vertex-ai) |

Your API keys are stored locally and encrypted. We never see your keys or your data.

> **Note**: You can use MetricFrame without an API key, but AI features (metric generation, explanations, recommendations) will be disabled.

## Supported Frameworks

| Framework | Functions | Metrics |
|-----------|-----------|---------|
| **NIST CSF 2.0** | Govern, Identify, Protect, Detect, Respond, Recover | 276 |
| **NIST AI RMF 1.0** | Govern, Map, Measure, Manage | 80 |

## Features

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
Desktop App:
┌──────────────────────────────────────────────────┐
│  Electron Shell                                   │
│  ┌────────────────┐  ┌────────────────────────┐  │
│  │  React Frontend │  │  Python Backend        │  │
│  │                 │  │  + SQLite Database     │  │
│  └────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────┘

Docker Deployment:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React + TS    │    │   FastAPI + PY   │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend        │◄──►│   Database      │
│   (nginx)       │    │   (uvicorn)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
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

# Copy environment template
cp backend/.env.example backend/.env
# Edit backend/.env to add your API keys

# Start with Docker
docker compose up -d

# Or run directly
cd backend && pip install -r requirements.txt && uvicorn src.main:app --reload &
cd frontend && npm install && npm run dev
```

### Access Points
- **Frontend**: http://localhost:5175
- **API Documentation**: http://localhost:8002/docs
- **Health Check**: http://localhost:8002/health

## Configuration

### Environment Variables

```env
# Database (PostgreSQL for Docker, SQLite for Desktop)
DATABASE_URL=postgresql://metricframe:metricframe@localhost:5432/metricframe

# AI Provider API Keys (bring your own - choose one or more)
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
TOGETHER_API_KEY=your-key-here
AZURE_OPENAI_API_KEY=your-key-here
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-key-here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Risk Thresholds
RISK_THRESHOLD_VERY_LOW=90.0
RISK_THRESHOLD_LOW=75.0
RISK_THRESHOLD_MEDIUM=50.0
RISK_THRESHOLD_HIGH=30.0
```

## Documentation

- [Authentication & User Management](docs/AUTHENTICATION.md) - Roles, permissions, password recovery
- [Frameworks Guide](docs/frameworks-guide.md) - Learn about NIST CSF 2.0 and AI RMF 1.0
- [Scoring Methodology](docs/scoring-method.md) - How scores are calculated
- [AI RMF Support](docs/ai-rmf-support.md) - AI Risk Management Framework details
- [Catalog Import Guide](docs/catalog-import-guide.md) - Import your own metrics
- [Code Signing Guide](docs/CODE_SIGNING.md) - For building signed releases

## Security

- **100% Local**: No data ever leaves your infrastructure
- **Role-Based Access Control**: Admin, Editor, and Viewer roles with enforced permissions
- **Encrypted Credentials**: API keys stored with Fernet encryption
- **Password Recovery**: Recovery key + security questions for account recovery
- **Open Source**: Full code transparency - audit it yourself
- **No Telemetry**: We don't track usage or collect any data

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
