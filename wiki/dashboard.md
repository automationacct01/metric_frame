# Dashboard Guide

> **Last Updated:** February 2026
> **Status:** Active Development

---

The executive dashboard provides a comprehensive view of your organization's cybersecurity posture through risk visualization, framework coverage, and actionable insights.

## Executive Overview

The dashboard serves as the primary interface for security leadership, providing:

- Real-time risk scores by framework function
- Visual coverage mapping across security categories
- Quick identification of metrics needing attention
- Framework switching for multi-compliance environments

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                      │
│  ┌──────────────────────┐              ┌─────────────────────────────────┐  │
│  │ Security Overview    │              │ [CSF 2.0 ▼] [Default Metrics]  │  │
│  │ (hover for details)  │              │ 12:30 PM  [↻]                   │  │
│  └──────────────────────┘              └─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  VIEW TABS                                                                   │
│  ┌────────────────────────┬────────────────────────┐                        │
│  │ 📊 Risk Dashboard      │ 🌳 Framework Coverage   │                        │
│  └────────────────────────┴────────────────────────┘                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  OVERALL SUMMARY (when Risk Dashboard tab active)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  72.5%        │  356        │  65%       │  12         │  2          │    │
│  │  MODERATE     │  Total      │  At Target │  Below      │  High Risk  │    │
│  │               │  Metrics    │            │  Target     │  Functions  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│  SCORE CARDS                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ GOVERN  │ │IDENTIFY │ │ PROTECT │ │ DETECT  │ │ RESPOND │ │ RECOVER │   │
│  │   78%   │ │   65%   │ │   82%   │ │   71%   │ │   68%   │ │   74%   │   │
│  │  ████   │ │  ███    │ │  ████   │ │  ███    │ │  ███    │ │  ███    │   │
│  │  LOW    │ │MODERATE │ │  LOW    │ │MODERATE │ │MODERATE │ │MODERATE │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  METRICS NEEDING ATTENTION                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ID | Metric Name         | Function | Priority | Current | Score    │    │
│  │ 42 | MFA Adoption Rate   | PROTECT  | High     | 65%     | 42%      │    │
│  │ 18 | Patch Cadence       | PROTECT  | High     | 21 days | 38%      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Header Elements

The header contains key navigation and context elements with informative tooltips:

| Element | Location | Tooltip Description |
|---------|----------|---------------------|
| **Security Overview** | Left | Your organization's cybersecurity posture at a glance |
| **Framework Selector** | Right | Switch between NIST CSF 2.0 and AI RMF frameworks |
| **Active Catalog** | Right | Shows current metric catalog with metric count |
| **Timestamp** | Right | Last score calculation time (auto-refreshes every 30s) |
| **Refresh Button** | Right | Manually recalculate all scores |

## View Tabs

The dashboard provides two primary views via tab navigation:

| Tab | Purpose |
|-----|---------|
| **Risk Dashboard** | Weighted risk scores by function with metrics needing attention |
| **Framework Coverage** | Visual map of metric coverage across all framework categories |

## Risk Score Cards

Each CSF function displays a dedicated score card showing:

### Score Card Components

| Element | Description |
|---------|-------------|
| **Function Name** | GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER |
| **Percentage Score** | Weighted average of all metrics in function |
| **Visual Bar** | Color-coded progress indicator |
| **Risk Rating** | Text label (Very Low, Low, Moderate, Elevated, High) |
| **Trend Indicator** | Arrow showing change from previous period |

### Risk Color Coding

| Score Range | Color | Risk Rating | Meaning |
|-------------|-------|-------------|---------|
| 90-100% | Dark Green | Very Low | Exceeding targets |
| 75-89% | Green | Low | Meeting targets |
| 60-74% | Yellow | Moderate | Approaching targets |
| 40-59% | Orange | Elevated | Below targets |
| 0-39% | Red | High | Significantly below targets |

### Score Card Interaction

Click any score card to navigate to the **Function Detail** view:
- View all categories within the function with score cards
- See category-level scores and risk ratings
- Click any category card to drill down to **Category Detail** view

## Category Detail View

When you click a category card (e.g., "GV.AI-OC - AI Organizational Context"), you see:

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                      │
│  [< Back to GOVERN]                                    [Reset Filters]       │
│                                                                              │
│  GV.AI-OC - AI Organizational Context                          [ELEVATED]   │
│  "Policies for AI systems are defined and documented"                        │
│                                                                              │
│      ████████████████████░░░░░░░░░░░░  70.9%    ▲ +3.2% vs last month       │
│                                                                              │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│    │ 4 Metrics    │  │ 0 At Target  │  │ 4 Below      │                     │
│    └──────────────┘  └──────────────┘  └──────────────┘                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  KEY INSIGHTS                                           [AI Explain]         │
│  • Highest gap: "Policy Review Frequency" at -50% below target              │
│  • Quick win: "AI Training Completion" only 10% below target                │
│  • Trend: Category score down 5.2% over 30 days                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  FILTERS & SEARCH                                                            │
│  [Priority: All ▼] [🔍 Search metrics...]                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  METRICS TABLE                                                               │
│  │ Metric │ Score │ Current │ Target │ Gap │ Priority │ Owner │             │
│  │ Policy Review │ 60% │ 2/yr │ 4/yr │ -50% │ HIGH │ Legal │               │
│  │ AI Training │ 90% │ 85% │ 95% │ -10% │ MED │ HR │                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  VISUALIZATIONS                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                   │
│  │ Score Distribution      │  │ Gap to Target           │                   │
│  │ (Horizontal bars)       │  │ (Diverging bar chart)   │                   │
│  └─────────────────────────┘  └─────────────────────────┘                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  TREND CHART (7/30/90 day toggle)                                            │
│  [Filter Metric: All ▼] [View: Both ▼]                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Search & Filter Features

| Filter | Description |
|--------|-------------|
| **Search** | Filter metrics by name (persists in URL) |
| **Priority** | Filter by High/Medium/Low priority |
| **Trend Metric** | Filter trend chart to single metric |
| **Timeframe** | Toggle 7/30/90 day trend view |

### Reset Filters

Click **Reset Filters** button (appears when any filter is active) to:
- Clear search query
- Reset trend metric filter
- Reset priority filter
- Clear URL search parameters
- Show all metrics in category

### Navigation from MetricsGrid

The Metrics Catalog includes a **Dashboard Navigation Button** (blue icon) next to each metric's lock icon:
- Navigates directly to the category dashboard for that metric
- Pre-fills search filter with the metric name
- Auto-filters trend chart to show only that metric

## CSF Coverage View

The coverage view provides a visual map of framework implementation:

### Coverage Display

```
Function: GOVERN (GV)
├── GV.OC - Organizational Context    ████████░░ 80%  (8/10 metrics)
├── GV.RM - Risk Management Strategy  ██████████ 95%  (6/6 metrics)
├── GV.RR - Roles & Responsibilities  ███████░░░ 72%  (5/7 metrics)
├── GV.PO - Policy                    ████████░░ 85%  (7/8 metrics)
├── GV.OV - Oversight                 ██████░░░░ 62%  (4/6 metrics)
└── GV.SC - Cybersecurity Supply Chain ████░░░░░░ 45%  (3/8 metrics)
```

### Coverage Metrics

| Indicator | Description |
|-----------|-------------|
| **Progress Bar** | Visual representation of category score |
| **Percentage** | Average score for metrics in category |
| **Metric Count** | Number of metrics vs total possible |
| **Color** | Risk status color matching score thresholds |

### Filtering Coverage

- Filter by risk rating (show only Elevated/High)
- Sort by score (ascending/descending)
- Group by function or view flat list
- Search by category code or name

## Active Catalog Display

The dashboard header shows the currently active metric catalog:

### Catalog Information

| Field | Description |
|-------|-------------|
| **Catalog Name** | User-defined name for the catalog |
| **Metric Count** | Number of metrics in active catalog |
| **Owner** | User who created the catalog |
| **Last Updated** | When catalog was last modified |

### Catalog States

| State | Display |
|-------|---------|
| **Default Catalog** | "Default (356 metrics)" |
| **Custom Active** | Catalog name with metric count |
| **No Catalog** | "No active catalog - using defaults" |

### Switching Catalogs

1. Click the catalog name in header
2. Select from available catalogs
3. Confirm activation
4. Dashboard recalculates with new metrics

## Framework Selector

Switch between supported frameworks:

### Available Frameworks

| Framework | Description |
|-----------|-------------|
| **NIST CSF 2.0** | Cybersecurity Framework (default) |
| **NIST AI RMF** | AI Risk Management Framework |
| **Cyber AI Profile** | CSF extended for AI systems |

### Framework Switching

1. Click framework dropdown in header
2. Select target framework
3. Dashboard updates:
   - Score cards show framework functions
   - Coverage view shows framework categories
   - Metrics filter to framework-mapped items

### Cross-Framework Behavior

When switching frameworks:
- Metrics with mappings appear in new view
- Unmapped metrics remain accessible via Metrics Grid
- Scores recalculate using framework-specific aggregation
- Category codes update to match framework

## Metrics Needing Attention

The attention panel highlights metrics below target:

### Attention Criteria

Metrics appear when:
- Score below 60% (configurable threshold)
- Marked as high priority
- No recent data updates
- Significant negative trend

### Attention Display

| Column | Description |
|--------|-------------|
| **Metric Name** | Clickable link to metric details |
| **Current Score** | Percentage with color indicator |
| **Gap** | Points below target |
| **Trend** | Direction over last period |
| **Priority** | High/Medium/Low badge |

### Quick Actions

From the attention panel:
- Click metric name to edit
- View historical trend
- Add to improvement plan
- Assign to team member

## Dashboard Interactions

### Refresh Data

| Method | Action |
|--------|--------|
| **Auto-refresh** | Every 5 minutes (configurable) |
| **Manual** | Click refresh icon in header |
| **Navigation** | Data loads on page focus |

### Export Options

| Format | Contents |
|--------|----------|
| **PDF Report** | Executive summary with charts |
| **CSV Data** | Raw scores and metrics |
| **JSON API** | Programmatic access |

### Customization

Users can customize:
- Default framework on login
- Score threshold colors
- Attention panel criteria
- Dashboard layout (compact/expanded)
- **Theme**: Toggle between light mode (default) and dark mode via Settings

## Dashboard API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /scores/overview` | All function scores |
| `GET /scores/function/{code}` | Single function detail |
| `GET /scores/categories` | Category-level scores |
| `GET /metrics/attention` | Below-target metrics |

## Performance Notes

| Optimization | Implementation |
|--------------|----------------|
| **Lazy Loading** | Categories load on expand |
| **Caching** | Framework data cached 5 min |
| **Incremental** | Only changed scores recalculate |

---

**Next:** [Metrics Management](metrics-management.md) - Learn to manage KRIs effectively
