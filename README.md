# MetricFrame - AI & Cyber Risk Metrics

A comprehensive web application for managing and visualizing cybersecurity Key Risk Indicators (KRIs) aligned with **NIST Cybersecurity Framework 2.0** and **NIST AI Risk Management Framework 1.0**.

## 🎯 Overview

This application provides:

- **Multi-Framework Support**: Unified dashboard for NIST CSF 2.0 (cybersecurity) and AI RMF 1.0 (AI risk)
- **Executive Dashboard**: Color-coded risk scores across all framework functions
- **Metrics Catalog**: 356 total metrics (276 CSF 2.0 + 80 AI RMF) with risk definitions and gap-to-target scoring
- **AI Assistant**: Multi-provider support (6 options) for intelligent metrics management and explanation
- **Interactive UI**: Spreadsheet-like editing with real-time score calculations and column tooltips
- **Local-First**: Runs entirely on Docker for secure, offline-capable deployment

### Supported Frameworks

| Framework | Functions | Metrics |
|-----------|-----------|---------|
| **NIST CSF 2.0** | Govern, Identify, Protect, Detect, Respond, Recover | 276 |
| **NIST AI RMF 1.0** | Govern, Map, Measure, Manage | 80 |

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React + TS    │    │   FastAPI + PY   │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend        │◄──►│   Database      │
│   (Port 5175)   │    │   (Port 8002)    │    │   (Port 5432)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Run the Application

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd metricframe
   ```

2. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your AI API keys (optional)
   ```

3. **Start the application**
   ```bash
   ./dev.sh
   ```

4. **Access the application**
   - Frontend: http://localhost:5175
   - API Documentation: http://localhost:8002/docs
   - Database: localhost:5434

The application will automatically:
- Build and start all containers
- Run database migrations
- Load 356 pre-configured metrics (276 CSF 2.0 + 80 AI RMF) with risk definitions

## 📊 Features

### Executive Dashboard
- **Function Scores**: Performance metrics for each NIST CSF 2.0 function
- **Risk Ratings**: Color-coded Low/Moderate/Elevated/High risk levels
- **Attention Metrics**: Top metrics requiring immediate focus
- **Catalog Switching**: Toggle between default and custom metrics catalogs
- **Trend Analysis**: Historical performance tracking (future enhancement)

### Bring Your Own Catalog 🆕
- **Custom Metrics Import**: Upload CSV/JSON files with your organization's metrics
- **AI-Powered CSF Mapping**: Automatic suggestions for mapping metrics to NIST CSF 2.0 functions
- **Flexible Field Mapping**: Map your file columns to standard metric fields
- **Multi-Catalog Support**: Switch between different metrics catalogs seamlessly
- **Zero Code Changes**: Use existing dashboard and scoring with your own metrics

### Scoring Methodology
- **Gap-to-Target**: Transparent calculation based on current vs target values
- **Weighted Aggregation**: Priority-based weighting (High=1.0, Medium=0.6, Low=0.3)
- **Multiple Directions**: Higher-is-better, lower-is-better, target-range, binary
- **Configurable Thresholds**: Customizable risk rating boundaries

### AI-Powered Metrics Management
- **Natural Language**: "Add a metric for board cyber briefings"
- **Structured Output**: JSON-validated metric definitions
- **Context Awareness**: Understands existing metrics to avoid duplication
- **Review Process**: Human approval required before applying changes

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql://nist:nist@db:5432/nistmetrics
RISK_THRESHOLD_VERY_LOW=90.0
RISK_THRESHOLD_LOW=75.0
RISK_THRESHOLD_MEDIUM=50.0
RISK_THRESHOLD_HIGH=30.0
```

**AI Configuration**: Configure your AI provider through Settings → AI Configuration in the app. Bring your own API key with 6 provider options available.

### Risk Rating Thresholds
- **Very Low Risk**: ≥90% achievement
- **Low Risk**: 75-89% achievement
- **Medium Risk**: 50-74% achievement
- **High Risk**: 30-49% achievement
- **Very High Risk**: <30% achievement

## 📈 Comprehensive Metrics Catalog

The application includes 356 enterprise-grade metrics across all cybersecurity domains:

### Govern (GV) - 48 metrics
**Governance & Strategic Leadership (36 CSF + 12 AI Profile):**
- Board Cyber Briefing Frequency (4/year target)
- Policy Compliance Rate (95% target)
- Cybersecurity Budget Allocation (8% target)
- CISO Direct Reporting to Executive Level
- Cybersecurity Strategy Document Currency
- Risk Assessment Frequency
- Security Training Completion Rate
- Regulatory Compliance Assessment Score
- Security Governance Committee Meeting Frequency
- And 39 additional governance metrics...

### Identify (ID) - 47 metrics
**Asset Management & Risk Assessment (35 CSF + 12 AI Profile):**
- Asset Inventory Accuracy (99% target)
- Vulnerability Scan Coverage (100% target)
- Critical Vulnerability MTTF (7 days target)
- Software Asset Inventory Accuracy
- Cloud Asset Visibility
- Network Mapping Completeness
- Data Classification Completeness
- Third-Party Risk Assessment Currency
- Supply Chain Visibility Score
- And 38 additional identification metrics...

### Protect (PR) - 56 metrics
**Safeguards & Access Controls (44 CSF + 12 AI Profile):**
- MFA Coverage for Privileged Accounts (100% target)
- Patch Compliance Critical Severity (90% target)
- Zero Trust Architecture Implementation (70% target)
- Email Security Gateway Effectiveness
- Endpoint Protection Coverage
- Data Encryption at Rest
- Privileged Access Management Coverage
- Application Security Testing Coverage
- Secure Code Review Coverage
- And 47 additional protection metrics...

### Detect (DE) - 44 metrics
**Monitoring & Threat Detection (32 CSF + 12 AI Profile):**
- Mean Time to Detect - MTTD (24 hours target)
- Security Event Monitoring Coverage
- User Behavior Analytics Coverage
- Threat Hunting Success Rate (40% target)
- False Positive Rate (20% target)
- Malware Detection Rate (95% target)
- Insider Threat Detection Coverage
- Cloud Security Monitoring Coverage
- API Security Monitoring
- And 35 additional detection metrics...

### Respond (RS) - 42 metrics
**Incident Response & Crisis Management (30 CSF + 12 AI Profile):**
- Mean Time to Respond - MTTR (24 hours target)
- Incident Response Plan Activation
- Crisis Management Team Activation Time
- Digital Forensics Response Time
- Communication Plan Execution
- Containment Effectiveness
- Incident Classification Accuracy
- Automated Response Action Success Rate
- Cross-Functional Response Coordination
- And 33 additional response metrics...

### Recover (RC) - 39 metrics
**Business Continuity & Recovery (31 CSF + 8 AI Profile):**
- Backup Restore Success Rate (98% target)
- Recovery Time Objective Achievement (90% target)
- Recovery Point Objective Achievement (95% target)
- Data Recovery Completeness Testing
- Cloud Service Recovery Testing
- Business Continuity Plan Testing
- Vendor Recovery Coordination
- Recovery Team Cross-Training Coverage
- And 31 additional recovery metrics...

## 🤖 NIST AI RMF 1.0 Metrics

The application also includes metrics aligned with the **NIST AI Risk Management Framework 1.0** for organizations managing AI-specific risks.

### AI RMF Functions

| Function | Metrics | Focus |
|----------|---------|-------|
| **Govern** | 22 | AI policies, training, team diversity, oversight |
| **Map** | 18 | AI system documentation, risk/impact assessments |
| **Measure** | 22 | Model accuracy, bias, explainability, security, drift |
| **Manage** | 18 | Incident response, decommissioning, third-party risk |

### Trustworthiness Characteristics

AI RMF metrics are categorized by trustworthiness characteristics:
- **Valid & Reliable** - Accuracy and consistency
- **Safe** - Harm prevention
- **Secure & Resilient** - Attack resistance
- **Accountable & Transparent** - Traceability
- **Explainable & Interpretable** - Understandable reasoning
- **Privacy Enhanced** - Data protection
- **Fair** - Equitable treatment

See [docs/ai-rmf-support.md](docs/ai-rmf-support.md) for complete AI RMF documentation.

## 🛠️ Development

### Project Structure
```
metricframe/
├── backend/
│   ├── src/
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic validation schemas
│   │   ├── main.py            # FastAPI application
│   │   ├── routers/           # API endpoints
│   │   ├── services/          # Business logic
│   │   └── seeds/             # Sample data
│   ├── alembic/               # Database migrations
│   └── tests/                 # Backend tests
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── api/               # API client
│   │   ├── types/             # TypeScript definitions
│   │   └── state/             # State management
│   └── package.json
├── docker/                    # Docker configurations
└── docs/                      # Documentation
```

### API Endpoints

**Metrics Management**
- `GET /api/v1/metrics` - List metrics with filtering
- `POST /api/v1/metrics` - Create new metric
- `PUT /api/v1/metrics/{id}` - Update metric
- `DELETE /api/v1/metrics/{id}` - Soft delete metric

**Scoring & Risk Assessment**
- `GET /api/v1/scores` - Get all function scores
- `GET /api/v1/scores/dashboard/summary` - Dashboard data
- `POST /api/v1/scores/recalculate` - Refresh all scores

**AI Assistant**
- `POST /api/v1/ai/chat` - Chat with AI assistant
- `POST /api/v1/ai/actions/apply` - Apply AI suggestions
- `GET /api/v1/ai/history` - View AI interaction history

### Database Schema

**Core Tables**
- `metrics` - Main metrics catalog with CSF alignment
- `metric_history` - Time series data
- `ai_change_log` - Audit trail of AI modifications
- `users` - User management (future)

## 🔍 Testing

### Run Backend Tests
```bash
cd backend
poetry install
poetry run pytest
```

### Run Frontend Tests  
```bash
cd frontend
npm install
npm test
```

## 📚 Documentation

- **API Documentation**: http://localhost:8002/docs (Swagger UI)
- **Frameworks Guide**: [docs/frameworks-guide.md](docs/frameworks-guide.md) - Learn about NIST CSF 2.0 and AI RMF 1.0
- **Scoring Methodology**: [docs/scoring-method.md](docs/scoring-method.md)
- **AI RMF Support**: [docs/ai-rmf-support.md](docs/ai-rmf-support.md)
- **Catalog Import Guide**: [docs/catalog-import-guide.md](docs/catalog-import-guide.md)

## 🛡️ Security & Compliance

- **Multi-Framework Aligned**: Support for NIST CSF 2.0 and NIST AI RMF 1.0
- **Gap-to-Target Scoring**: Industry-standard risk measurement methodology
- **Audit Logging**: All AI-driven changes tracked and attributed
- **Local Deployment**: No external data transmission required
- **Role-Based Access**: Framework prepared for future RBAC implementation

## 🚀 Deployment Options

### Local Development (Current)
- Docker Compose with hot-reload
- SQLite or PostgreSQL database
- No authentication required

### Production Deployment (Future Roadmap)
- Kubernetes deployment
- Production-grade PostgreSQL
- OAuth2/OIDC authentication
- TLS termination
- External data connectors
- Historical trending database

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: Report bugs or feature requests
- **Documentation**: Check `/docs` folder for detailed guides
- **API Reference**: http://localhost:8002/docs when running locally

## 📊 Roadmap

- **Phase 1** ✅: Core metrics management and scoring
- **Phase 2** ✅: AI-powered metrics assistance  
- **Phase 3** 🔄: Advanced metrics catalog UI with inline editing
- **Phase 4** 📋: Historical trending and analytics
- **Phase 5** 📋: Authentication and role-based access
- **Phase 6** 📋: External data connectors and automation
- **Phase 7** 📋: Advanced reporting and PDF generation

---

Built with ❤️ for cybersecurity professionals using NIST Cybersecurity Framework 2.0