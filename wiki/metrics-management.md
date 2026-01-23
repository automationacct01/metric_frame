# Metrics Management

> **Last Updated:** January 2026
> **Status:** Active Development

---

Comprehensive guide to managing Key Risk Indicators (KRIs) in Cyber Metrics Flow, including the 208 pre-configured metrics, catalog system, and import/export capabilities.

## Metrics Overview

Metrics in Cyber Metrics Flow represent measurable security KRIs that track your organization's cybersecurity posture. Each metric includes:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Descriptive identifier | "MFA Adoption Rate" |
| **Description** | Detailed explanation | "Percentage of users with MFA enabled" |
| **Current Value** | Latest measurement | 85 |
| **Target Value** | Goal to achieve | 95 |
| **Unit** | Measurement unit | "%" |
| **Direction** | How to interpret values | higher_is_better |
| **CSF Function** | NIST CSF alignment | PROTECT |
| **CSF Category** | Specific category | PR.AA |
| **Priority** | Importance weighting | High |

## 208 Pre-Configured Metrics

The application includes a comprehensive library of security metrics:

### Distribution by Function

| Function | Count | Focus Areas |
|----------|-------|-------------|
| **GOVERN** | 35 | Board reporting, policy compliance, risk management |
| **IDENTIFY** | 34 | Asset management, vulnerability scanning, risk assessment |
| **PROTECT** | 44 | Access control, awareness, data security, maintenance |
| **DETECT** | 30 | Monitoring, detection processes, event analysis |
| **RESPOND** | 28 | Response planning, communications, analysis, mitigation |
| **RECOVER** | 28 | Recovery planning, improvements, communications |

### Example Metrics by Function

**GOVERN (GV)**
- Board cybersecurity briefing frequency
- Policy compliance rate
- Security budget as percentage of IT budget
- Risk assessment completion rate
- Third-party risk review coverage

**IDENTIFY (ID)**
- Asset inventory completeness
- Vulnerability scan coverage
- Risk assessment currency
- Supply chain security assessments
- Data classification completion

**PROTECT (PR)**
- MFA adoption rate
- Patching cadence (critical vulnerabilities)
- Encryption coverage (data at rest)
- Security awareness training completion
- Backup success rate

**DETECT (DE)**
- Mean Time to Detect (MTTD)
- Security monitoring coverage
- False positive rate
- Threat hunting frequency
- UEBA deployment coverage

**RESPOND (RS)**
- Mean Time to Respond (MTTR)
- Incident response plan testing
- Containment effectiveness
- Communication timeliness
- Post-incident review completion

**RECOVER (RC)**
- Recovery Time Objective achievement
- Backup restore success rate
- Business continuity test frequency
- Lessons learned implementation
- Stakeholder communication timeliness

## MetricsGrid Features

The MetricsGrid component provides a comprehensive interface for metric management:

### Grid Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FILTERS & SEARCH                                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────────────┐ │
│  │ Function ▼  │ │ Category ▼  │ │ Priority ▼  │ │ 🔍 Search metrics...   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  TOOLBAR                                                                     │
│  [+ Add Metric] [📤 Export CSV] [📥 Import] [🔄 Refresh] [⚙️ Settings]      │
├─────────────────────────────────────────────────────────────────────────────┤
│  METRICS TABLE                                                               │
│  ┌────────┬──────────────────┬─────────┬────────┬───────┬────────┬───────┐ │
│  │ Number │ Name             │ Current │ Target │ Score │ Status │ Actions│ │
│  ├────────┼──────────────────┼─────────┼────────┼───────┼────────┼───────┤ │
│  │ PR-001 │ MFA Adoption     │ 85%     │ 95%    │ 89%   │ 🟢     │ ✏️ 🔒 │ │
│  │ PR-002 │ Patch Cadence    │ 12 days │ 7 days │ 58%   │ 🟠     │ ✏️ 🔒 │ │
│  │ DE-001 │ MTTD             │ 4.2 hrs │ 1 hr   │ 24%   │ 🔴     │ ✏️ 🔒 │ │
│  └────────┴──────────────────┴─────────┴────────┴───────┴────────┴───────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  PAGINATION                                                                  │
│  Showing 1-25 of 208 metrics  [◀ Prev] [1] [2] [3] ... [9] [Next ▶]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Filtering Options

| Filter | Options | Behavior |
|--------|---------|----------|
| **Function** | GV, ID, PR, DE, RS, RC | Show metrics in function |
| **Category** | All categories for selected function | Show metrics in category |
| **Priority** | High, Medium, Low | Filter by importance |
| **Status** | All, Meeting Target, Below Target | Filter by performance |
| **Search** | Free text | Matches name, description |

### Column Header Tooltips

Every column header in the MetricsGrid includes a hover tooltip explaining what that column contains:

| Column | Tooltip Description |
|--------|---------------------|
| **Lock** | Lock/unlock metric for editing protection |
| **Number** | Unique identifier code (e.g., GV-01, PR-02) |
| **Name** | Descriptive name of the metric |
| **Formula** | Calculation method for metric value |
| **Current** | Latest measured value |
| **Target** | Goal value to achieve |
| **Score** | Gap-to-target performance percentage |
| **Function** | NIST CSF 2.0 function alignment |
| **Category** | CSF category within the function |
| **Subcategory** | Specific CSF subcategory outcome |

Hover over any column header to see its description.

### Sorting

Click column headers to sort:
- **Number**: Alphanumeric by metric code
- **Name**: Alphabetical
- **Current/Target**: Numeric
- **Score**: By calculated score
- **Status**: By risk rating

### Bulk Operations

Select multiple metrics for:
- Bulk priority update
- Bulk category reassignment
- Export selected to CSV
- Bulk delete (with confirmation)

## Adding New Metrics

### Manual Creation

1. Click **+ Add Metric** in toolbar
2. Fill required fields:

```
┌─────────────────────────────────────────────────────────────┐
│  ADD NEW METRIC                                              │
├─────────────────────────────────────────────────────────────┤
│  Name*:          [______________________________]           │
│  Description*:   [______________________________]           │
│                  [______________________________]           │
│  Current Value*: [________]  Unit: [____]                   │
│  Target Value*:  [________]                                 │
│  Direction*:     [higher_is_better ▼]                       │
│  CSF Function*:  [PROTECT ▼]                                │
│  CSF Category*:  [PR.AA - Identity Management ▼]            │
│  Priority*:      [High ▼]                                   │
├─────────────────────────────────────────────────────────────┤
│  [Cancel]                                    [Create Metric] │
└─────────────────────────────────────────────────────────────┘
```

### AI-Assisted Creation

1. Open AI Chat panel
2. Describe the metric in natural language:
   > "Create a metric for tracking the percentage of endpoints with EDR agents installed"
3. Review AI-generated structure including:
   - Name and description
   - CSF Function, Category, and Subcategory mapping
   - Target value with appropriate units
   - Calculation formula
   - Risk definition explaining business relevance
   - Priority assignment
4. Confirm to create metric

The AI automatically maps metrics to the full NIST CSF 2.0 hierarchy (Function → Category → Subcategory) and generates formulas without percentage conversion (the system handles display formatting).

### Direction Types

| Direction | Description | Example |
|-----------|-------------|---------|
| `higher_is_better` | Higher values = better performance | MFA adoption rate |
| `lower_is_better` | Lower values = better performance | Mean Time to Detect |
| `target_range` | Value should be within range | Budget variance |
| `binary` | Pass/fail (0 or 100) | Annual audit completion |

## Lock Mechanism

Metrics support locking to prevent accidental edits:

### Lock States

| State | Icon | Behavior |
|-------|------|----------|
| **Unlocked** | 🔓 | Full edit capability |
| **Locked** | 🔒 | Read-only, requires unlock |
| **System** | 🔐 | Cannot be modified (seed data) |

### Locking Operations

- **Lock**: Click lock icon on metric row
- **Unlock**: Click lock icon, confirm unlock
- **Bulk Lock**: Select metrics, choose "Lock Selected"

## CSV Import/Export

### Export to CSV

1. Click **📤 Export CSV** in toolbar
2. Choose export scope:
   - All metrics
   - Filtered view
   - Selected metrics
3. Download CSV file

**Export Format:**
```csv
metric_number,name,description,current_value,target_value,unit,direction,csf_function,csf_category,priority
PR-001,MFA Adoption Rate,Percentage of users with MFA,85,95,%,higher_is_better,PROTECT,PR.AA,High
```

### Import from CSV

1. Click **📥 Import** in toolbar
2. Upload CSV file
3. Map columns to fields
4. Preview import data
5. Confirm import

See [Catalog System](#catalog-system-byoc) for advanced import with the Catalog Wizard.

## Catalog System (BYOC)

The Bring Your Own Catalog system allows custom metric libraries:

### What is a Catalog?

A catalog is a named collection of metrics with:
- Custom metric definitions
- Framework mappings
- Priority assignments
- Owner attribution

### Creating a Catalog

**Option 1: Empty Catalog**
1. Navigate to Catalogs > Create New
2. Enter catalog name and description
3. Add metrics manually or via AI

**Option 2: Import via Wizard**
1. Navigate to Catalogs > Import
2. Follow the 5-step wizard (see below)

### 5-Step Import Wizard

```
Step 1: UPLOAD          Step 2: MAPPING         Step 3: CSF MAPPING
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Drop CSV here   │    │ CSV → Fields    │    │ AI suggests CSF │
│ or click browse │ => │ name → Name     │ => │ categories for  │
│                 │    │ value → Current │    │ each metric     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      ▼
Step 5: ACTIVATION      Step 4: ENHANCEMENT
┌─────────────────┐    ┌─────────────────┐
│ Set as active   │    │ AI suggests     │
│ catalog for     │ <= │ improvements:   │
│ scoring         │    │ - Priorities    │
└─────────────────┘    │ - Descriptions  │
                       └─────────────────┘
```

#### Step 1: Upload
- Supported formats: CSV, TSV
- Maximum file size: 10MB
- Encoding: UTF-8
- Preview first 5 rows

#### Step 2: Field Mapping
Map CSV columns to metric fields:

| Metric Field | Required | Auto-Detect |
|--------------|----------|-------------|
| Name | Yes | "name", "metric_name" |
| Current Value | Yes | "current", "value" |
| Target Value | No | "target", "goal" |
| Description | No | "description", "desc" |
| Unit | No | "unit", "uom" |
| Priority | No | "priority", "importance" |

#### Step 3: CSF Mapping
AI analyzes each metric and suggests:
- CSF Function (GV, ID, PR, DE, RS, RC)
- CSF Category (e.g., PR.AA, DE.CM)
- Confidence score

Review and adjust mappings before proceeding.

#### Step 4: Enhancement
AI suggests improvements:
- Clearer descriptions
- Appropriate priorities
- Better target values
- Additional related metrics

Accept, modify, or skip suggestions.

#### Step 5: Activation
- Review summary of imported metrics
- Choose to activate immediately or later
- Confirm catalog creation

### Activating/Deactivating Catalogs

**Activate Catalog:**
1. Go to Catalogs list
2. Click "Activate" on desired catalog
3. Confirm activation
4. Dashboard now uses this catalog

**Deactivate Catalog:**
1. Activate a different catalog, or
2. Click "Use Default" to return to seed data

### Catalog Management

| Action | Description |
|--------|-------------|
| **View** | See all metrics in catalog |
| **Edit** | Modify catalog name/description |
| **Clone** | Copy catalog as starting point |
| **Export** | Download catalog as CSV |
| **Delete** | Remove catalog (with confirmation) |

### Active Catalog Metrics Endpoint

```bash
# Get all metrics from active catalog
GET /api/v1/catalogs/active/metrics

# Response includes:
# - Catalog info
# - All metrics with scores
# - CSF mappings
```

## Metric Editing

### Inline Editing

Quick edits directly in the grid:
1. Click the edit icon on metric row
2. Modify values in expanded row
3. Click Save or Cancel

### Full Editor

For comprehensive editing:
1. Click metric name to open details
2. Access all fields including history
3. View related metrics
4. Access AI suggestions

### Editable Fields

| Field | Inline | Full Editor |
|-------|--------|-------------|
| Current Value | Yes | Yes |
| Target Value | Yes | Yes |
| Priority | Yes | Yes |
| Name | No | Yes |
| Description | No | Yes |
| CSF Mapping | No | Yes |
| Direction | No | Yes |

## Metric History

Track metric values over time:

### History View

```
Metric: MFA Adoption Rate
┌────────────────────────────────────────────────┐
│  100% ┤                              ●────●    │
│   90% ┤                    ●────●───●          │
│   80% ┤         ●────●────●                    │
│   70% ┤    ●───●                               │
│   60% ┤───●                                    │
│       └────┴────┴────┴────┴────┴────┴────┴───  │
│        Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  │
└────────────────────────────────────────────────┘

History Table:
| Date       | Value | Change | Note           |
|------------|-------|--------|----------------|
| 2026-01-15 | 85%   | +3%    | Q4 rollout     |
| 2025-12-01 | 82%   | +5%    |                |
| 2025-11-01 | 77%   | +2%    | Phase 2 start  |
```

### Recording History

- Automatic: Values recorded on update
- Manual: Add historical data points
- Import: Bulk import history via CSV

---

**Next:** [AI Assistant](ai-assistant.md) - Leverage AI for metrics management
