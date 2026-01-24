# Understanding the Frameworks

This guide provides an educational overview of the two risk management frameworks supported by this application: **NIST Cybersecurity Framework (CSF) 2.0** and **NIST AI Risk Management Framework (AI RMF) 1.0**.

---

## NIST Cybersecurity Framework 2.0

### What is NIST CSF?

The **NIST Cybersecurity Framework (CSF)** is a voluntary framework developed by the National Institute of Standards and Technology to help organizations manage and reduce cybersecurity risk. Originally released in 2014 and updated to version 2.0 in February 2024, CSF provides a common language and systematic methodology for managing cyber risk.

### Who Should Use CSF?

CSF 2.0 is designed for organizations of **all sizes, sectors, and maturity levels**:

- Critical infrastructure operators
- Government agencies
- Private sector businesses
- Healthcare organizations
- Financial institutions
- Educational institutions
- Small and medium businesses
- Non-profit organizations

### The CSF Core Structure

CSF 2.0 is organized into a three-tier hierarchy:

```
Framework
└── Functions (6)
    └── Categories (22)
        └── Subcategories (106)
```

### The Six Functions

CSF 2.0 organizes cybersecurity activities into six high-level **Functions**:

#### 1. GOVERN (GV) - NEW in CSF 2.0
**Purpose:** Establish and monitor the organization's cybersecurity risk management strategy, expectations, and policy.

**Key Activities:**
- Establishing cybersecurity policies and procedures
- Defining roles and responsibilities
- Risk management strategy development
- Supply chain risk management
- Cybersecurity in enterprise risk management

**Why It Matters:** Governance ensures cybersecurity is integrated into business strategy and that leadership is accountable for cyber risk decisions.

#### 2. IDENTIFY (ID)
**Purpose:** Understand the organization's cybersecurity risk to systems, people, assets, data, and capabilities.

**Key Activities:**
- Asset management and inventory
- Business environment understanding
- Risk assessment
- Vulnerability identification
- Supply chain risk identification

**Why It Matters:** You cannot protect what you don't know you have. Identification creates the foundation for all other security activities.

#### 3. PROTECT (PR)
**Purpose:** Implement appropriate safeguards to ensure delivery of critical services.

**Key Activities:**
- Identity management and access control
- Security awareness training
- Data security and encryption
- Protective technology deployment
- Platform security (applications, infrastructure)

**Why It Matters:** Protection reduces the likelihood and impact of cybersecurity events through preventive controls.

#### 4. DETECT (DE)
**Purpose:** Develop and implement activities to identify the occurrence of a cybersecurity event.

**Key Activities:**
- Continuous monitoring
- Anomaly detection
- Security event analysis
- Threat intelligence integration

**Why It Matters:** Early detection limits damage by reducing the time attackers have access to systems (dwell time).

#### 5. RESPOND (RS)
**Purpose:** Take action regarding a detected cybersecurity incident.

**Key Activities:**
- Incident response planning and execution
- Incident analysis and triage
- Incident containment
- Communication and reporting
- Mitigation activities

**Why It Matters:** Effective response minimizes damage, reduces recovery time, and preserves evidence for investigation.

#### 6. RECOVER (RC)
**Purpose:** Maintain plans for resilience and restore any capabilities or services impaired by a cybersecurity incident.

**Key Activities:**
- Recovery planning and execution
- Business continuity
- Communication during recovery
- Lessons learned and improvements

**Why It Matters:** Recovery ensures business continuity and builds organizational resilience against future incidents.

### CSF Categories and Subcategories

Each Function contains **Categories** (broad cybersecurity outcomes) and **Subcategories** (specific outcomes or controls).

**Example - Protect Function:**
```
PR (Protect)
├── PR.AA - Identity Management, Authentication, and Access Control
│   ├── PR.AA-01: Identities and credentials are managed
│   ├── PR.AA-02: Identities are proofed and bound to credentials
│   ├── PR.AA-03: Users, services, and hardware are authenticated
│   └── ...
├── PR.AT - Awareness and Training
├── PR.DS - Data Security
├── PR.PS - Platform Security
└── PR.IR - Technology Infrastructure Resilience
```

### CSF Profiles and Tiers

**Profiles** describe an organization's current and target cybersecurity posture:
- **Current Profile:** Where you are now
- **Target Profile:** Where you want to be
- **Gap Analysis:** The difference between current and target

**Implementation Tiers** describe the rigor of cybersecurity risk management:
- **Tier 1 - Partial:** Ad hoc, reactive
- **Tier 2 - Risk Informed:** Risk-aware but not organization-wide
- **Tier 3 - Repeatable:** Formal policies, consistent implementation
- **Tier 4 - Adaptive:** Continuous improvement, proactive adaptation

### Benefits of Using CSF

1. **Common Language:** Enables communication across technical and business teams
2. **Flexibility:** Adaptable to any organization size or sector
3. **Risk-Based:** Focuses resources on highest-priority risks
4. **Compliance Support:** Maps to many regulatory requirements (HIPAA, PCI-DSS, SOX)
5. **Continuous Improvement:** Supports ongoing maturity development
6. **Supply Chain:** Provides framework for vendor risk management

---

## NIST AI Risk Management Framework 1.0

### What is AI RMF?

The **NIST AI Risk Management Framework (AI RMF)** is a voluntary framework released in January 2023 to help organizations design, develop, deploy, and use AI systems responsibly. It addresses the unique risks posed by artificial intelligence, including bias, lack of transparency, and potential for harm.

### Why Was AI RMF Created?

AI systems present unique challenges not fully addressed by traditional cybersecurity frameworks:

- **Opacity:** AI decisions can be difficult to explain or understand
- **Bias:** AI can perpetuate or amplify societal biases
- **Emergent Behavior:** AI systems may behave unexpectedly
- **Rapid Evolution:** AI technology changes faster than traditional software
- **Societal Impact:** AI decisions can affect employment, justice, healthcare, and more

### Who Should Use AI RMF?

AI RMF is designed for any organization that:
- Develops AI systems
- Deploys AI systems
- Uses AI-powered products or services
- Procures AI from third parties
- Regulates or oversees AI use

### AI RMF Core Structure

AI RMF is organized around four core **Functions**:

```
AI RMF Core
├── GOVERN - Cross-cutting function
├── MAP - Context and risk identification
├── MEASURE - Risk analysis and tracking
└── MANAGE - Risk treatment and monitoring
```

### The Four Functions

#### 1. GOVERN
**Purpose:** Cultivate a culture of risk management and establish processes for AI risk governance.

**Key Activities:**
- Policies and procedures for AI risk management
- Roles, responsibilities, and accountability
- Organizational AI risk tolerance
- AI workforce diversity and expertise
- Documentation and transparency requirements

**Categories:**
- GOVERN-1: Legal, regulatory, and policy requirements
- GOVERN-2: Accountability structures
- GOVERN-3: Workforce diversity and culture
- GOVERN-4: Organizational commitments
- GOVERN-5: Policies and procedures
- GOVERN-6: Oversight and documentation

**Why It Matters:** Governance establishes the foundation for responsible AI use across the organization.

#### 2. MAP
**Purpose:** Identify context, scope, and risks associated with AI systems.

**Key Activities:**
- Documenting AI system purposes and intended uses
- Identifying stakeholders and impacts
- Understanding deployment contexts
- Cataloging potential benefits and risks
- Assessing legal and ethical implications

**Categories:**
- MAP-1: Context and intended purpose
- MAP-2: Categorization of AI systems
- MAP-3: AI capabilities and limitations
- MAP-4: Risk identification
- MAP-5: Impact assessment

**Why It Matters:** You cannot manage risks you haven't identified. Mapping creates awareness of AI-specific risks.

#### 3. MEASURE
**Purpose:** Analyze, assess, and track AI risks and impacts.

**Key Activities:**
- Testing AI systems for performance and bias
- Measuring trustworthiness characteristics
- Tracking risk metrics over time
- Evaluating real-world performance
- Assessing third-party AI components

**Categories:**
- MEASURE-1: Risk measurement approaches
- MEASURE-2: AI system evaluation
- MEASURE-3: Risk tracking mechanisms
- MEASURE-4: Feedback integration

**Why It Matters:** Measurement provides objective evidence of AI system trustworthiness and identifies emerging risks.

#### 4. MANAGE
**Purpose:** Allocate resources and implement strategies to address AI risks.

**Key Activities:**
- Risk treatment decisions (accept, mitigate, transfer, avoid)
- Implementing risk controls
- Incident response for AI failures
- Continuous monitoring
- Decommissioning AI systems safely

**Categories:**
- MANAGE-1: Risk prioritization
- MANAGE-2: Risk treatment strategies
- MANAGE-3: Third-party risk management
- MANAGE-4: Incident management and response

**Why It Matters:** Management turns risk awareness into action, ensuring AI systems remain trustworthy throughout their lifecycle.

### AI Trustworthiness Characteristics

AI RMF defines seven characteristics of **trustworthy AI**:

#### 1. Valid and Reliable
- AI outputs are accurate, consistent, and dependable
- Systems perform as intended across different conditions
- Results can be reproduced and verified

**Metrics Example:** Model accuracy, prediction consistency, drift detection

#### 2. Safe
- AI systems do not cause harm to people, property, or environment
- Safeguards prevent dangerous behaviors
- Fail-safe mechanisms are in place

**Metrics Example:** Impact assessments, safety testing coverage, incident rates

#### 3. Secure and Resilient
- AI systems resist attacks and unauthorized access
- Systems recover from failures and adversarial inputs
- Data and models are protected from manipulation

**Metrics Example:** Adversarial testing, security assessments, resilience testing

#### 4. Accountable and Transparent
- Clear responsibility for AI decisions and outcomes
- Audit trails for AI system behavior
- Stakeholders can understand how AI is used

**Metrics Example:** Documentation completeness, audit trail coverage, governance compliance

#### 5. Explainable and Interpretable
- AI decisions can be understood by relevant stakeholders
- Reasoning behind outputs can be articulated
- Users can appropriately calibrate trust

**Metrics Example:** Explainability scores, user comprehension testing

#### 6. Privacy-Enhanced
- AI systems protect personal and sensitive information
- Data collection and use is minimized and transparent
- Privacy regulations are followed

**Metrics Example:** Privacy compliance rate, data minimization adherence

#### 7. Fair (with Harmful Bias Managed)
- AI treats all individuals and groups equitably
- Bias is identified, measured, and mitigated
- Disparate impacts are addressed

**Metrics Example:** Bias detection rates, fairness testing coverage, demographic parity

### AI RMF Profiles

Like CSF, AI RMF supports **profiles** for specific use cases:

- **Risk Profile:** Organization's AI risk tolerance and priorities
- **Use Case Profile:** Requirements for specific AI applications
- **Sector Profile:** Industry-specific AI considerations

### Benefits of Using AI RMF

1. **Trustworthiness:** Builds confidence in AI systems among stakeholders
2. **Risk Awareness:** Identifies AI-specific risks often missed by traditional frameworks
3. **Regulatory Preparation:** Aligns with emerging AI regulations (EU AI Act, etc.)
4. **Competitive Advantage:** Demonstrates responsible AI practices
5. **Innovation Enablement:** Manages risk without stifling beneficial AI use
6. **Stakeholder Trust:** Increases confidence from customers, employees, and partners

---

## How CSF and AI RMF Work Together

### Complementary Frameworks

CSF and AI RMF are designed to work together:

| Aspect | CSF 2.0 | AI RMF 1.0 |
|--------|---------|------------|
| **Focus** | Cybersecurity risk | AI-specific risk |
| **Scope** | All IT systems | AI/ML systems |
| **Threats** | Cyber attacks, data breaches | Bias, opacity, misuse |
| **Controls** | Security controls | Trustworthiness controls |

### Shared Governance

Both frameworks emphasize governance as foundational:
- CSF GOVERN function aligns with AI RMF GOVERN
- Risk management processes apply to both domains
- Board/executive oversight covers both cyber and AI risk

### Integrated Approach

Organizations using AI should:
1. Apply **CSF** to secure AI infrastructure and data
2. Apply **AI RMF** to ensure AI systems are trustworthy
3. Integrate metrics from both frameworks in risk reporting
4. Coordinate governance across both domains

### NIST Crosswalk

NIST provides an official crosswalk mapping AI RMF to CSF 2.0:
- AI security requirements map to CSF Protect and Detect
- AI incident response maps to CSF Respond and Recover
- AI governance aligns with CSF Govern

---

## Key Terminology

### CSF Terms

| Term | Definition |
|------|------------|
| **Function** | Highest level of framework organization (6 in CSF) |
| **Category** | Subdivision of functions into groups of outcomes |
| **Subcategory** | Specific outcome statements |
| **Profile** | Alignment of functions/categories with requirements |
| **Tier** | Level of rigor in risk management practices |
| **Informative Reference** | Mappings to standards, guidelines, and practices |

### AI RMF Terms

| Term | Definition |
|------|------------|
| **AI System** | Engineered or machine-based system that generates outputs |
| **AI Actor** | Person or organization involved in AI lifecycle |
| **Trustworthiness** | Characteristics that make AI systems worthy of trust |
| **AI Lifecycle** | Stages from design through deployment and retirement |
| **Emergent Risk** | Risks that arise from AI behavior in deployment |
| **Human-AI Teaming** | Collaboration between humans and AI systems |

---

## Getting Started

### For Organizations New to These Frameworks

1. **Assess Current State:** Evaluate existing cybersecurity and AI governance
2. **Identify Priorities:** Determine highest-risk areas for your organization
3. **Start Small:** Begin with core functions before expanding
4. **Measure Progress:** Implement metrics to track improvement
5. **Iterate:** Continuously refine based on lessons learned

### Using This Application

This dashboard helps you operationalize both frameworks by:

- **Tracking Metrics:** Monitor key risk indicators aligned to framework functions
- **Scoring Performance:** Calculate gap-to-target scores for each function
- **Identifying Gaps:** Highlight areas needing attention
- **Reporting:** Provide executive-level risk visibility
- **AI Assistance:** Generate and manage metrics using natural language

---

## Additional Resources

### NIST CSF 2.0
- [NIST CSF 2.0 Official Document](https://www.nist.gov/cyberframework)
- [CSF 2.0 Quick Start Guides](https://www.nist.gov/cyberframework/getting-started)
- [CSF Reference Tool](https://csrc.nist.gov/Projects/Cybersecurity-Framework)

### NIST AI RMF 1.0
- [AI RMF Official Document](https://www.nist.gov/itl/ai-risk-management-framework)
- [AI RMF Playbook](https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook)
- [AI RMF Roadmap](https://www.nist.gov/itl/ai-risk-management-framework/roadmap-nist-artificial-intelligence-risk-management-framework)

### Crosswalks and Mappings
- [AI RMF Crosswalk to CSF 2.0](https://www.nist.gov/document/crosswalk-ai-rmf-10-csf-20)
- [CSF 2.0 Reference Mappings](https://csrc.nist.gov/Projects/Cybersecurity-Framework/Filters)

### Related Standards
- ISO/IEC 27001 - Information Security Management
- ISO/IEC 42001 - AI Management System
- NIST SP 800-53 - Security and Privacy Controls
- NIST SP 800-218 - Secure Software Development Framework
