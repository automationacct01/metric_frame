# NIST CSF 2.0 Cybersecurity Metrics Dashboard

A comprehensive web application for managing and visualizing cybersecurity Key Risk Indicators (KRIs) aligned with the NIST Cybersecurity Framework 2.0.

## 🎯 Overview

This application provides:

- **Executive Dashboard**: RAG-rated risk scores across all 6 NIST CSF 2.0 Functions (Govern, Identify, Protect, Detect, Respond, Recover)
- **Metrics Catalog**: 200+ comprehensive security metrics with transparent gap-to-target scoring
- **AI Assistant**: OpenAI/Claude integration for intelligent metrics management and explanation
- **Interactive UI**: Spreadsheet-like editing with real-time score calculations
- **Local-First**: Runs entirely on Docker for secure, offline-capable deployment

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React + TS    │    │   FastAPI + PY   │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend        │◄──►│   Database      │
│   (Port 5173)   │    │   (Port 8000)    │    │   (Port 5432)   │
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
   cd cyber_metrics_flow
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
   - Frontend: http://localhost:5173
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:5432

The application will automatically:
- Build and start all containers
- Run database migrations
- Load 200+ comprehensive metrics across all CSF functions
- Generate sample historical data

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
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
AI_MODEL=gpt-4o-mini  # or claude-3-5-sonnet-20241022
RISK_THRESHOLD_LOW=85.0
RISK_THRESHOLD_MODERATE=65.0
RISK_THRESHOLD_ELEVATED=40.0
```

### Risk Rating Thresholds
- **Low Risk**: ≥85% achievement
- **Moderate Risk**: 65-84% achievement  
- **Elevated Risk**: 40-64% achievement
- **High Risk**: <40% achievement

## 📈 Comprehensive Metrics Catalog

The application includes 200+ enterprise-grade metrics across all cybersecurity domains:

### Govern (GV) - 35 metrics
**Governance & Strategic Leadership:**
- Board Cyber Briefing Frequency (4/year target)
- Policy Compliance Rate (95% target) 
- Cybersecurity Budget Allocation (8% target)
- CISO Direct Reporting to Executive Level
- Cybersecurity Strategy Document Currency
- Risk Assessment Frequency
- Security Training Completion Rate
- Regulatory Compliance Assessment Score
- Security Governance Committee Meeting Frequency
- And 26 additional governance metrics...

### Identify (ID) - 34 metrics  
**Asset Management & Risk Assessment:**
- Asset Inventory Accuracy (99% target)
- Vulnerability Scan Coverage (100% target)
- Critical Vulnerability MTTF (7 days target)
- Software Asset Inventory Accuracy
- Cloud Asset Visibility
- Network Mapping Completeness
- Data Classification Completeness
- Third-Party Risk Assessment Currency
- Supply Chain Visibility Score
- And 25 additional identification metrics...

### Protect (PR) - 44 metrics
**Safeguards & Access Controls:**
- MFA Coverage for Privileged Accounts (100% target)
- Patch Compliance Critical Severity (90% target)
- Zero Trust Architecture Implementation (70% target)
- Email Security Gateway Effectiveness
- Endpoint Protection Coverage
- Data Encryption at Rest
- Privileged Access Management Coverage
- Application Security Testing Coverage
- Secure Code Review Coverage
- And 35 additional protection metrics...

### Detect (DE) - 30 metrics
**Monitoring & Threat Detection:**
- Mean Time to Detect - MTTD (24 hours target)
- Security Event Monitoring Coverage
- User Behavior Analytics Coverage
- Threat Hunting Success Rate (40% target)
- False Positive Rate (20% target)
- Malware Detection Rate (95% target)
- Insider Threat Detection Coverage
- Cloud Security Monitoring Coverage
- API Security Monitoring
- And 21 additional detection metrics...

### Respond (RS) - 28 metrics
**Incident Response & Crisis Management:**
- Mean Time to Respond - MTTR (24 hours target)
- Incident Response Plan Activation
- Crisis Management Team Activation Time
- Digital Forensics Response Time
- Communication Plan Execution
- Containment Effectiveness
- Incident Classification Accuracy
- Automated Response Action Success Rate
- Cross-Functional Response Coordination
- And 19 additional response metrics...

### Recover (RC) - 28 metrics
**Business Continuity & Recovery:**
- Backup Restore Success Rate (98% target)
- Recovery Time Objective Achievement (90% target)
- Recovery Point Objective Achievement (95% target)
- Data Recovery Completeness Testing
- Cloud Service Recovery Testing
- Business Continuity Plan Testing
- Vendor Recovery Coordination
- Recovery Team Cross-Training Coverage
- And 20 additional recovery metrics...

## 🛠️ Development

### Project Structure
```
cyber_metrics_flow/
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

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Scoring Methodology**: [docs/scoring-method.md](docs/scoring-method.md)
- **Metric Fields**: [docs/metric-fields.md](docs/metric-fields.md)
- **AI Usage Guide**: [docs/ai-usage-guide.md](docs/ai-usage-guide.md)

## 🛡️ Security & Compliance

- **NIST CSF 2.0 Aligned**: All metrics mapped to Framework functions
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
- **API Reference**: http://localhost:8000/docs when running locally

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