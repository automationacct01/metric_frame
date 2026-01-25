# Demo Mode

> **Last Updated:** January 2026
> **Status:** Active Development

---

Demo mode provides a quick way to experience MetricFrame without configuration or API keys. It's ideal for evaluating the application before full deployment.

## Accessing Demo Mode

Navigate to http://localhost:5173/demo (or your deployment URL + `/demo`).

### Starting a Demo Session

1. Enter any email address to identify your session
2. Select your preferred framework (NIST CSF 2.0 or AI RMF)
3. Click "Start Demo" to begin

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    Welcome to MetricFrame Demo                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Email: [your.email@company.com                           ] │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Select Framework:                                               │
│  ○ NIST CSF 2.0 (Cybersecurity)                                 │
│  ○ NIST AI RMF (AI Risk Management)                             │
│                                                                  │
│                    [Start Demo]                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Demo Features

Demo mode includes most application features with simulated data:

| Feature | Available | Notes |
|---------|-----------|-------|
| **Dashboard** | Yes | Pre-populated risk scores |
| **Score Cards** | Yes | All framework functions displayed |
| **Framework Coverage** | Yes | Complete category visualization |
| **Metrics Grid** | Yes | Sample metrics with realistic values |
| **AI Chat** | Limited | 5 queries per session |
| **Catalog Import** | No | Disabled in demo |
| **Settings** | View Only | Cannot modify configurations |

## Demo Banner

During a demo session, a banner appears at the top of every page:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Demo Mode: NIST CSF 2.0 │ AI Queries: 3/5 │ [Exit Demo]     │
└─────────────────────────────────────────────────────────────────┘
```

The banner shows:
- Current framework selection
- Remaining AI query quota
- Exit button to end the demo session

## AI Chat in Demo Mode

The AI assistant is available with limited quota:

### Demo Quota
- **5 AI queries** per demo session
- Quota resets when starting a new session
- Query count displayed in demo banner

### Available AI Modes
- **Metrics Mode**: Create sample metrics (not saved)
- **Explain Mode**: Get risk explanations
- **Report Mode**: Generate summary reports
- **Recommendations**: Receive improvement suggestions

### Demo AI Limitations
- Created metrics are not persisted
- Cannot modify existing metrics
- Enhancement suggestions are display-only

## Simulated Data

Demo mode uses realistic simulated data:

### Metrics
- 276 pre-configured cybersecurity metrics
- 80 AI RMF metrics (when AI RMF selected)
- Realistic current values and targets
- Distributed across all framework functions

### Scores
- Function scores calculated from simulated metrics
- Category-level breakdowns available
- Risk ratings based on standard thresholds

### Time Sensitivity
- Last updated timestamps reflect demo session start
- No historical trend data in demo mode

## Demo vs Full Application

| Capability | Demo Mode | Full Application |
|------------|-----------|------------------|
| View Dashboard | Yes | Yes |
| View Metrics | Yes | Yes |
| Create Metrics | Preview Only | Full CRUD |
| AI Queries | 5 per session | Unlimited* |
| Import Catalogs | No | Yes |
| Export Data | No | Yes |
| Configure AI | No | Yes |
| User Accounts | None | Full Auth |
| Data Persistence | Session Only | Database |

*Subject to API rate limits

## Exiting Demo Mode

To exit demo mode:
1. Click "Exit Demo" in the banner
2. Or navigate to the landing page
3. Or click "Login" in navigation

Exiting clears your demo session data.

## Transitioning to Full Application

After evaluating via demo mode:

1. **Install Locally**: Follow [Getting Started](getting-started.md)
2. **Configure AI**: Set up API keys in [AI Assistant](ai-assistant.md#configuring-your-provider)
3. **Import Your Data**: Use [Catalog Import](../docs/catalog-import-guide.md)

---

**Next:** [Metrics Management](metrics-management.md) - Learn to work with KRIs
