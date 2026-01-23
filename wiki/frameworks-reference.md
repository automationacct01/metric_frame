# Frameworks Reference

> **Last Updated:** January 2026
> **Status:** Active Development

---

Cyber Metrics Flow supports multiple security and AI governance frameworks. This reference covers the structure, functions, and relationships of each supported framework.

## Supported Frameworks Overview

| Framework | Version | Focus | Functions |
|-----------|---------|-------|-----------|
| **NIST CSF** | 2.0 | Cybersecurity risk management | 6 |
| **NIST AI RMF** | 1.0 | AI system risk management | 4 |
| **Cyber AI Profile** | 1.0 | AI-enhanced cybersecurity | 6 (extended) |

### Framework Comparison

| Aspect | NIST CSF 2.0 | AI RMF 1.0 | Cyber AI Profile |
|--------|--------------|------------|------------------|
| **Primary Use** | General cybersecurity | AI systems | AI in security |
| **Scope** | Organization-wide | AI lifecycle | Security AI systems |
| **Structure** | Functions/Categories | Functions/Characteristics | Extended CSF |
| **Metrics in App** | 208 | TBD | TBD |
| **Maturity** | Established | Newer | Emerging |

## NIST Cybersecurity Framework 2.0

### What is NIST CSF 2.0?

The NIST Cybersecurity Framework (CSF) provides a policy framework of computer security guidance for organizations to assess and improve their ability to prevent, detect, and respond to cyber attacks.

**Key Characteristics:**
- Voluntary framework (mandatory for federal agencies)
- Risk-based approach
- Industry-agnostic
- Outcome-focused

### CSF 2.0 Hierarchy

```
Framework
└── Functions (6)
    └── Categories (23)
        └── Subcategories (108)
            └── Metrics (208 in app)
```

### 6 Core Functions

| Code | Function | Purpose | Metrics |
|------|----------|---------|---------|
| **GV** | GOVERN | Establish cybersecurity governance | 35 |
| **ID** | IDENTIFY | Understand organizational risks | 34 |
| **PR** | PROTECT | Implement safeguards | 44 |
| **DE** | DETECT | Discover cybersecurity events | 30 |
| **RS** | RESPOND | Take action on incidents | 28 |
| **RC** | RECOVER | Restore capabilities | 28 |

### Function Details

#### GOVERN (GV)

**Purpose:** Establish and monitor cybersecurity risk management strategy, expectations, and policy

| Category | Code | Description |
|----------|------|-------------|
| Organizational Context | GV.OC | Understanding organizational mission and stakeholders |
| Risk Management Strategy | GV.RM | Priorities, constraints, and risk tolerance |
| Roles & Responsibilities | GV.RR | Cybersecurity roles established |
| Policy | GV.PO | Organizational cybersecurity policy |
| Oversight | GV.OV | Results of risk management activities reviewed |
| Cybersecurity Supply Chain | GV.SC | Supply chain risk management |

**Example Metrics:**
- Board cybersecurity briefing frequency
- Policy compliance rate
- Risk tolerance documentation status
- Third-party risk assessment coverage

#### IDENTIFY (ID)

**Purpose:** Understand cybersecurity risks to systems, people, assets, data, and capabilities

| Category | Code | Description |
|----------|------|-------------|
| Asset Management | ID.AM | Assets identified and managed |
| Risk Assessment | ID.RA | Risk to operations assessed |
| Improvement | ID.IM | Improvements identified and managed |

**Example Metrics:**
- Asset inventory completeness
- Vulnerability scan coverage
- Risk assessment currency
- Threat intelligence integration

#### PROTECT (PR)

**Purpose:** Implement safeguards to ensure delivery of critical services

| Category | Code | Description |
|----------|------|-------------|
| Identity Management | PR.AA | Access to assets managed |
| Awareness & Training | PR.AT | Personnel trained |
| Data Security | PR.DS | Data protected |
| Platform Security | PR.PS | Technology platforms secured |
| Technology Infrastructure | PR.IR | Security architecture managed |

**Example Metrics:**
- MFA adoption rate
- Security awareness training completion
- Encryption coverage (data at rest/transit)
- Patch compliance rate

#### DETECT (DE)

**Purpose:** Identify cybersecurity events and anomalies

| Category | Code | Description |
|----------|------|-------------|
| Continuous Monitoring | DE.CM | Assets monitored for anomalies |
| Adverse Event Analysis | DE.AE | Anomalies analyzed |

**Example Metrics:**
- Mean Time to Detect (MTTD)
- Security monitoring coverage
- False positive rate
- Threat hunting frequency

#### RESPOND (RS)

**Purpose:** Take action regarding detected cybersecurity incidents

| Category | Code | Description |
|----------|------|-------------|
| Incident Management | RS.MA | Incidents managed |
| Incident Analysis | RS.AN | Incidents analyzed |
| Incident Response | RS.CO | Response activities coordinated |
| Incident Mitigation | RS.MI | Incidents contained and mitigated |

**Example Metrics:**
- Mean Time to Respond (MTTR)
- Incident containment rate
- Stakeholder notification timeliness
- Post-incident review completion

#### RECOVER (RC)

**Purpose:** Restore capabilities or services impaired by cybersecurity incidents

| Category | Code | Description |
|----------|------|-------------|
| Incident Recovery Plan | RC.RP | Recovery plan executed |
| Incident Recovery Communication | RC.CO | Recovery activities coordinated |

**Example Metrics:**
- Recovery Time Objective (RTO) achievement
- Backup restore success rate
- Business continuity test frequency
- Lessons learned implementation

### CSF Category Codes Reference

| Function | Categories |
|----------|------------|
| **GV** | GV.OC, GV.RM, GV.RR, GV.PO, GV.OV, GV.SC |
| **ID** | ID.AM, ID.RA, ID.IM |
| **PR** | PR.AA, PR.AT, PR.DS, PR.PS, PR.IR |
| **DE** | DE.CM, DE.AE |
| **RS** | RS.MA, RS.AN, RS.CO, RS.MI |
| **RC** | RC.RP, RC.CO |

## NIST AI Risk Management Framework 1.0

### What is AI RMF?

The NIST AI Risk Management Framework provides guidance for managing risks associated with artificial intelligence systems throughout their lifecycle.

**Key Characteristics:**
- Voluntary framework
- Applies to AI system developers and deployers
- Risk-based and outcome-focused
- Complements existing risk management practices

### AI RMF Structure

```
AI RMF
└── Core Functions (4)
    └── Categories
        └── Subcategories
```

### 4 Core Functions

| Code | Function | Purpose |
|------|----------|---------|
| **GOVERN** | Governance | Cultivate culture of risk management |
| **MAP** | Map | Context and risk framing |
| **MEASURE** | Measure | Identify and analyze AI risks |
| **MANAGE** | Manage | Prioritize and respond to risks |

### Function Details

#### GOVERN

**Purpose:** Establish organizational AI governance and risk culture

| Category | Description |
|----------|-------------|
| Policies & Procedures | AI risk policies established |
| Accountability | Roles and responsibilities defined |
| Workforce | AI risk management skills developed |
| Culture | Risk-aware culture fostered |

#### MAP

**Purpose:** Establish context and frame AI risks

| Category | Description |
|----------|-------------|
| Context | AI system context established |
| Risks | Potential risks categorized |
| Impacts | Potential impacts assessed |
| Trustworthiness | Trustworthiness requirements defined |

#### MEASURE

**Purpose:** Analyze and assess AI risks

| Category | Description |
|----------|-------------|
| Metrics | AI risk metrics established |
| Assessment | Risks assessed and documented |
| Monitoring | Risks monitored over time |
| Evaluation | Third-party evaluations conducted |

#### MANAGE

**Purpose:** Respond to and manage AI risks

| Category | Description |
|----------|-------------|
| Response | Risk response strategies defined |
| Documentation | Risk documentation maintained |
| Communication | Risks communicated to stakeholders |
| Improvement | Continuous improvement implemented |

### AI Trustworthiness Characteristics

AI RMF emphasizes seven trustworthiness characteristics:

| Characteristic | Description |
|----------------|-------------|
| **Valid & Reliable** | AI functions as intended |
| **Safe** | Does not endanger human life |
| **Secure & Resilient** | Resistant to attacks and failures |
| **Accountable & Transparent** | Decision processes explainable |
| **Explainable & Interpretable** | Outputs understandable |
| **Privacy-Enhanced** | Protects personal information |
| **Fair** | Manages harmful bias |

## Cyber AI Profile

### What is the Cyber AI Profile?

The Cyber AI Profile extends NIST CSF 2.0 to address the unique risks and controls associated with AI systems used in cybersecurity contexts.

**Key Characteristics:**
- Builds on CSF 2.0 foundation
- Adds AI-specific subcategories
- Bridges cybersecurity and AI governance
- Addresses AI in security operations

### How It Extends CSF 2.0

```
Standard CSF 2.0              Cyber AI Profile
┌─────────────────┐          ┌─────────────────────────────┐
│    PROTECT      │          │    PROTECT                  │
│    ├── PR.AA    │    →     │    ├── PR.AA               │
│    ├── PR.AT    │          │    ├── PR.AT               │
│    ├── PR.DS    │          │    ├── PR.DS               │
│    └── ...      │          │    ├── PR.AI (AI-specific) │
└─────────────────┘          │    └── ...                  │
                             └─────────────────────────────┘
```

### AI-Specific Extensions

#### Enhanced GOVERN (GV)

| Addition | Description |
|----------|-------------|
| GV.AI-OC | AI organizational context |
| GV.AI-RM | AI risk management strategy |
| GV.AI-PO | AI-specific policies |

#### Enhanced IDENTIFY (ID)

| Addition | Description |
|----------|-------------|
| ID.AI-AM | AI asset inventory |
| ID.AI-RA | AI-specific risk assessment |
| ID.AI-VL | AI vulnerability management |

#### Enhanced PROTECT (PR)

| Addition | Description |
|----------|-------------|
| PR.AI-AA | AI access controls |
| PR.AI-DS | AI data protection |
| PR.AI-ML | Model security controls |

#### Enhanced DETECT (DE)

| Addition | Description |
|----------|-------------|
| DE.AI-CM | AI system monitoring |
| DE.AI-AE | AI anomaly detection |
| DE.AI-AD | Adversarial detection |

#### Enhanced RESPOND (RS)

| Addition | Description |
|----------|-------------|
| RS.AI-MA | AI incident management |
| RS.AI-AN | AI incident analysis |
| RS.AI-MT | Model threat response |

#### Enhanced RECOVER (RC)

| Addition | Description |
|----------|-------------|
| RC.AI-RP | AI system recovery |
| RC.AI-RL | Model retraining procedures |

## Cross-Framework Mapping

### CSF 2.0 to AI RMF

| CSF Function | Related AI RMF |
|--------------|----------------|
| GOVERN | GOVERN |
| IDENTIFY | MAP |
| PROTECT | MANAGE |
| DETECT | MEASURE |
| RESPOND | MANAGE |
| RECOVER | MANAGE |

### Mapping in the Application

When a metric maps to multiple frameworks:

```
Metric: AI Model Version Control
├── CSF 2.0: PR.PS (Platform Security)
├── AI RMF: MANAGE (Documentation)
└── Cyber AI: PR.AI-ML (Model Security)
```

## Selecting a Framework

### When to Use NIST CSF 2.0

- General cybersecurity program management
- Compliance with federal requirements
- Broad organizational risk assessment
- Established security operations

### When to Use AI RMF

- Managing AI system development
- AI vendor risk assessment
- AI ethics and governance
- AI-specific compliance needs

### When to Use Cyber AI Profile

- Security operations using AI/ML
- AI-enhanced threat detection
- Security automation governance
- Combined cyber/AI risk management

### Framework Selection in Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  SELECT FRAMEWORK                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ○ NIST CSF 2.0                                             │
│    Standard cybersecurity framework                          │
│    208 metrics | 6 functions                                 │
│                                                              │
│  ○ NIST AI RMF 1.0                                          │
│    AI risk management framework                              │
│    -- metrics | 4 functions                                  │
│                                                              │
│  ○ Cyber AI Profile                                         │
│    CSF extended for AI systems                               │
│    -- metrics | 6 functions (extended)                       │
│                                                              │
│  [Apply Framework]                                           │
└─────────────────────────────────────────────────────────────┘
```

## Framework API

### List Frameworks

```bash
GET /api/v1/frameworks

Response:
{
  "frameworks": [
    {
      "id": "csf-2.0",
      "name": "NIST CSF 2.0",
      "version": "2.0",
      "function_count": 6,
      "category_count": 23
    },
    ...
  ]
}
```

### Get Framework Functions

```bash
GET /api/v1/frameworks/csf-2.0/functions

Response:
{
  "functions": [
    {
      "code": "GV",
      "name": "GOVERN",
      "description": "Establish and monitor...",
      "category_count": 6
    },
    ...
  ]
}
```

### Get Framework Categories

```bash
GET /api/v1/frameworks/csf-2.0/functions/PR/categories

Response:
{
  "categories": [
    {
      "code": "PR.AA",
      "name": "Identity Management, Authentication, and Access Control",
      "subcategory_count": 6
    },
    ...
  ]
}
```

---

**Next:** [API Reference](api-reference.md) - Complete REST API documentation
