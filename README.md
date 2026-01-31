# MetricFrame - AI & Cyber Risk Metrics

A free, open source application for managing and visualizing cybersecurity Key Risk Indicators (KRIs) aligned with **NIST Cybersecurity Framework 2.0** and **NIST AI Risk Management Framework 1.0**.

## Overview

MetricFrame provides:

- **Multi-Framework Support**: Unified dashboard for NIST CSF 2.0 (cybersecurity) and AI RMF 1.0 (AI risk)
- **Executive Dashboard**: Color-coded risk scores across all framework functions
- **Metrics Catalog**: 356 pre-configured metrics with risk definitions and gap-to-target scoring
- **AI Assistant**: Intelligent metrics management powered by your own API key (Anthropic Claude or OpenAI)
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
cd metricframe
docker compose -f docker-compose.prod.yml up -d
```

## Requirements

### Bring Your Own API Key

MetricFrame requires your own AI API key for the AI assistant features:

- **Anthropic Claude** (Recommended): Get a key at [console.anthropic.com](https://console.anthropic.com/account/keys)
- **OpenAI GPT-4**: Get a key at [platform.openai.com](https://platform.openai.com/api-keys)

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

### AI-Powered Metrics Management
- **Natural Language**: "Add a metric for board cyber briefings"
- **Context Awareness**: Understands existing metrics to avoid duplication
- **Review Process**: Human approval required before applying changes

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
cd metricframe

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

# AI Provider API Keys (bring your own)
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here

# Risk Thresholds
RISK_THRESHOLD_VERY_LOW=90.0
RISK_THRESHOLD_LOW=75.0
RISK_THRESHOLD_MEDIUM=50.0
RISK_THRESHOLD_HIGH=30.0
```

## Documentation

- [Frameworks Guide](docs/frameworks-guide.md) - Learn about NIST CSF 2.0 and AI RMF 1.0
- [Scoring Methodology](docs/scoring-method.md) - How scores are calculated
- [AI RMF Support](docs/ai-rmf-support.md) - AI Risk Management Framework details
- [Catalog Import Guide](docs/catalog-import-guide.md) - Import your own metrics
- [Code Signing Guide](docs/CODE_SIGNING.md) - For building signed releases

## Security

- **100% Local**: No data ever leaves your infrastructure
- **Encrypted Credentials**: API keys stored with Fernet encryption
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
