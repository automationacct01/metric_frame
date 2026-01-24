# Frameworks Reference

> **Last Updated:** January 2026
> **Status:** Active Development

---

MetricFrame supports multiple security and AI governance frameworks. This reference covers the structure, functions, and relationships of each supported framework.

## Supported Frameworks Overview

| Framework | Version | Focus | Functions | Metrics |
|-----------|---------|-------|-----------|---------|
| **NIST CSF** | 2.0 | Cybersecurity risk management | 6 | 208 |
| **NIST AI RMF** | 1.0 | AI system risk management | 4 | 18 |
| **Cyber AI Profile** | 1.0 | AI-enhanced cybersecurity | 6 (extended) | TBD |

### Framework Comparison

| Aspect | NIST CSF 2.0 | AI RMF 1.0 | Cyber AI Profile |
|--------|--------------|------------|------------------|
| **Primary Use** | General cybersecurity | AI systems | AI in security |
| **Scope** | Organization-wide | AI lifecycle | Security AI systems |
| **Structure** | Functions/Categories/Subcategories | Functions/Categories/Trustworthiness | Extended CSF |
| **Metrics in App** | 208 | 18 | TBD |
| **Maturity** | Established (since 2014) | Newer (2023) | Emerging |
| **Mandatory For** | US Federal agencies | Voluntary | Voluntary |

### Why Use Multiple Frameworks?

Organizations increasingly need both frameworks:
- **CSF 2.0** secures IT infrastructure, networks, and data
- **AI RMF** ensures AI systems are trustworthy and don't cause harm
- Together, they provide comprehensive risk coverage for modern digital environments

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

The **NIST AI Risk Management Framework (AI RMF)** is a voluntary framework released in January 2023 to help organizations design, develop, deploy, and use AI systems responsibly. It addresses the unique risks posed by artificial intelligence that traditional cybersecurity frameworks don't fully cover.

**Key Characteristics:**
- Voluntary framework for all organizations
- Applies to AI system developers, deployers, and users
- Risk-based and outcome-focused
- Complements existing risk management practices (including CSF)
- Lifecycle approach from design through decommissioning

### Why AI Needs Its Own Framework

AI systems present unique challenges:

| Challenge | Description | Example |
|-----------|-------------|---------|
| **Opacity** | AI decisions can be difficult to explain | Why did the model deny this loan? |
| **Bias** | AI can perpetuate or amplify societal biases | Hiring algorithm favoring certain demographics |
| **Emergent Behavior** | AI may behave unexpectedly in deployment | Chatbot producing harmful content |
| **Data Dependency** | AI quality depends on training data quality | Model trained on biased historical data |
| **Rapid Evolution** | AI changes faster than traditional software | Weekly model updates changing behavior |
| **Societal Impact** | AI decisions affect employment, justice, healthcare | Automated parole recommendations |

### AI RMF Structure

```
AI RMF
└── Core Functions (4)
    └── Categories (varies by function)
        └── Subcategories (specific outcomes)
            └── Trustworthiness Characteristics (7 types)
```

### 4 Core Functions

| Code | Function | Purpose | Metrics in App |
|------|----------|---------|----------------|
| **GOVERN** | Governance | Cultivate culture of risk management | 4 |
| **MAP** | Map | Context and risk framing | 3 |
| **MEASURE** | Measure | Identify and analyze AI risks | 6 |
| **MANAGE** | Manage | Prioritize and respond to risks | 5 |

### Function Details

#### GOVERN

**Purpose:** Establish organizational AI governance and risk culture. This is a cross-cutting function that informs and is informed by the other three functions.

| Category | Code | Description |
|----------|------|-------------|
| Legal & Regulatory | GOVERN-1 | Compliance with AI-related laws and standards |
| Accountability | GOVERN-2 | Clear roles, responsibilities, and authority |
| Workforce | GOVERN-3 | Diverse teams with AI risk management skills |
| Organizational Commitment | GOVERN-4 | Leadership support and resource allocation |
| Policies & Processes | GOVERN-5 | Documented AI risk management procedures |
| Oversight | GOVERN-6 | Monitoring and documentation requirements |

**Example Metrics in App:**
- AI Systems Inventory Completeness (75% current → 100% target)
- AI Policy Coverage (68% → 100%)
- AI Risk Management Training Completion (52% → 100%)
- AI Team Diversity Index (62 → 80 score)

#### MAP

**Purpose:** Establish context, categorize AI systems, and identify risks. Understanding what AI systems do and where they're used is essential before measuring or managing risks.

| Category | Code | Description |
|----------|------|-------------|
| Context & Purpose | MAP-1 | Document intended use and deployment context |
| Categorization | MAP-2 | Classify AI systems by risk level |
| Capabilities | MAP-3 | Understand AI system abilities and limitations |
| Risk Identification | MAP-4 | Identify potential risks and negative impacts |
| Impact Assessment | MAP-5 | Assess impacts on individuals and groups |

**Example Metrics in App:**
- AI System Purpose Documentation (80% → 100%)
- AI Risk Assessment Completion (65% → 100%)
- AI Impact Assessment Coverage for high-risk systems (45% → 100%)

#### MEASURE

**Purpose:** Analyze, assess, and track AI risks. This function ensures risks are quantified and monitored over time.

| Category | Code | Description |
|----------|------|-------------|
| Approaches | MEASURE-1 | Methods for measuring AI risks |
| Evaluation | MEASURE-2 | Testing for performance, bias, security |
| Tracking | MEASURE-3 | Ongoing monitoring of risks |
| Feedback | MEASURE-4 | Incorporating stakeholder input |

**Example Metrics in App:**
- AI Model Accuracy (89% → 95%)
- AI Bias Detection Rate (55% → 100%)
- AI Explainability Score (72% → 90%)
- AI Security Testing Coverage (40% → 100%)
- AI Model Drift Detection (60% → 100%)
- AI Privacy Compliance Rate (78% → 100%)

#### MANAGE

**Purpose:** Allocate resources and respond to AI risks. This function turns risk awareness into action.

| Category | Code | Description |
|----------|------|-------------|
| Prioritization | MANAGE-1 | Risk ranking and resource allocation |
| Treatment | MANAGE-2 | Strategies to address risks |
| Third-Party | MANAGE-3 | Managing vendor and partner AI risks |
| Response | MANAGE-4 | Incident management and communication |

**Example Metrics in App:**
- AI Incident Response Time (6.5 hrs current → 2 hrs target)
- AI Model Decommission Compliance (85% → 100%)
- Third-Party AI Risk Monitoring (50% → 100%)
- AI Stakeholder Feedback Integration (45% → 80%)

### AI Trustworthiness Characteristics

AI RMF defines seven characteristics that make AI systems worthy of trust. Each metric in the app is tagged with its primary trustworthiness characteristic.

| Characteristic | Code | Description | What It Means |
|----------------|------|-------------|---------------|
| **Valid & Reliable** | `valid_reliable` | AI outputs are accurate and consistent | The AI does what it's supposed to do, reliably |
| **Safe** | `safe` | AI does not cause harm | The AI won't hurt people, property, or environment |
| **Secure & Resilient** | `secure_resilient` | AI resists attacks and recovers from failures | The AI can't be easily hacked or manipulated |
| **Accountable & Transparent** | `accountable_transparent` | Clear responsibility and audit trails | Someone is responsible; decisions are traceable |
| **Explainable & Interpretable** | `explainable_interpretable` | Outputs can be understood | Users can understand why the AI made a decision |
| **Privacy-Enhanced** | `privacy_enhanced` | Personal data is protected | The AI respects privacy and data protection laws |
| **Fair** | `fair` | Treats all groups equitably | The AI doesn't discriminate or show bias |

### Trustworthiness in the Dashboard

In the Metrics Grid, the **Trustworthiness** column displays which characteristic each metric primarily measures, shown as a blue chip for easy identification. This helps organizations ensure they have coverage across all seven characteristics.

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

## Getting Started with Frameworks

### For Organizations New to These Frameworks

1. **Assess Your Needs:**
   - Do you have AI systems? → Use AI RMF
   - Do you have IT systems? → Use CSF 2.0
   - Most organizations need both

2. **Start with Governance:**
   - Both frameworks emphasize governance as foundational
   - Establish policies, roles, and accountability first

3. **Identify Your Assets:**
   - CSF: IT assets, networks, data
   - AI RMF: AI systems, models, training data

4. **Implement Metrics:**
   - Use this dashboard to track key risk indicators
   - Start with high-priority metrics first

5. **Iterate and Improve:**
   - Review scores regularly
   - Adjust targets as maturity improves

### Framework Selection Tips

| If You... | Start With... |
|-----------|---------------|
| Are new to cybersecurity frameworks | CSF 2.0 |
| Already have a security program | Add AI RMF for AI systems |
| Are deploying AI systems | AI RMF + relevant CSF controls |
| Need regulatory compliance | Check which framework applies |
| Want comprehensive coverage | Both frameworks together |

## Additional Resources

### Official NIST Resources

**NIST CSF 2.0:**
- [NIST CSF 2.0 Official Document](https://www.nist.gov/cyberframework)
- [CSF 2.0 Quick Start Guides](https://www.nist.gov/cyberframework/getting-started)
- [CSF Reference Tool](https://csrc.nist.gov/Projects/Cybersecurity-Framework)

**NIST AI RMF 1.0:**
- [AI RMF Official Document](https://www.nist.gov/itl/ai-risk-management-framework)
- [AI RMF Playbook](https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook)
- [AI RMF Roadmap](https://www.nist.gov/itl/ai-risk-management-framework/roadmap-nist-artificial-intelligence-risk-management-framework)

**Crosswalks:**
- [AI RMF Crosswalk to CSF 2.0](https://www.nist.gov/document/crosswalk-ai-rmf-10-csf-20)
- [CSF 2.0 Reference Mappings](https://csrc.nist.gov/Projects/Cybersecurity-Framework/Filters)

### Related Standards

| Standard | Focus | Relationship |
|----------|-------|--------------|
| ISO/IEC 27001 | Information Security Management | Maps to CSF |
| ISO/IEC 42001 | AI Management System | Maps to AI RMF |
| NIST SP 800-53 | Security Controls | Detailed controls for CSF |
| NIST SP 800-218 | Secure Software Development | Supports both frameworks |
| EU AI Act | AI Regulation | AI RMF helps compliance |

---

**Next:** [API Reference](api-reference.md) - Complete REST API documentation
