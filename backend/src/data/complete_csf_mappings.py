#!/usr/bin/env python3
"""Complete CSF category mappings for the remaining 43 unmapped metrics."""

# Expert-curated mappings based on NIST CSF 2.0 categories and subcategories
COMPLETE_CSF_MAPPINGS = {
    # GOVERN FUNCTION - Missing 9 metrics
    "CISO Direct Reporting to Executive Level": {
        "csf_category_code": "GV.RR",
        "csf_subcategory_code": "GV.RR-01", 
        "csf_category_name": "Roles and Responsibilities",
        "csf_subcategory_outcome": "Cybersecurity roles and responsibilities are established, communicated, and enforced throughout the organization"
    },
    "Cybersecurity Strategy Document Currency": {
        "csf_category_code": "GV.RM",
        "csf_subcategory_code": "GV.RM-04",
        "csf_category_name": "Risk Management Strategy", 
        "csf_subcategory_outcome": "Strategic direction and priorities for cybersecurity risk management are established and communicated"
    },
    "Crisis Communication Plan Testing": {
        "csf_category_code": "GV.RM",
        "csf_subcategory_code": "GV.RM-05",
        "csf_category_name": "Risk Management Strategy",
        "csf_subcategory_outcome": "Lines of communication across the organization are established for cybersecurity issues, including escalation pathways for cybersecurity issues"
    },
    "Data Protection Officer Appointment": {
        "csf_category_code": "GV.RR",
        "csf_subcategory_code": "GV.RR-01",
        "csf_category_name": "Roles and Responsibilities",
        "csf_subcategory_outcome": "Cybersecurity roles and responsibilities are established, communicated, and enforced throughout the organization"
    },
    "Executive Security Training Completion": {
        "csf_category_code": "GV.OC",
        "csf_subcategory_code": "GV.OC-05",
        "csf_category_name": "Organizational Context",
        "csf_subcategory_outcome": "Outcomes, roles, and responsibilities for cybersecurity risk management are established, communicated, and enforced"
    },
    "Security Investment ROI Measurement": {
        "csf_category_code": "GV.OV",
        "csf_subcategory_code": "GV.OV-01",
        "csf_category_name": "Oversight",
        "csf_subcategory_outcome": "Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction"
    },
    "Security ROI Demonstration": {
        "csf_category_code": "GV.OV",
        "csf_subcategory_code": "GV.OV-01", 
        "csf_category_name": "Oversight",
        "csf_subcategory_outcome": "Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction"
    },
    "Insider Threat Program Maturity": {
        "csf_category_code": "GV.RM",
        "csf_subcategory_code": "GV.RM-07",
        "csf_category_name": "Risk Management Strategy",
        "csf_subcategory_outcome": "Risk management strategy is informed by cybersecurity threat intelligence and information on vulnerabilities and threat actor tactics, techniques, and procedures"
    },
    "Security Awareness Campaign Effectiveness": {
        "csf_category_code": "GV.OC",
        "csf_subcategory_code": "GV.OC-05",
        "csf_category_name": "Organizational Context", 
        "csf_subcategory_outcome": "Outcomes, roles, and responsibilities for cybersecurity risk management are established, communicated, and enforced"
    },

    # IDENTIFY FUNCTION - Missing 12 metrics
    "Application Portfolio Completeness": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-02",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "Software platforms, applications, and services are inventoried within the organization"
    },
    "Configuration Management Database Currency": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-07",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "Asset criticality, locations, network connections, and custodians are documented"
    },
    "Data Flow Mapping Completeness": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-03",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "Communication and data flows are cataloged"
    },
    "Data Residency Mapping": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-03",
        "csf_category_name": "Asset Management", 
        "csf_subcategory_outcome": "Communication and data flows are cataloged"
    },
    "IoT Device Discovery Rate": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-01",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "Physical devices and systems are inventoried within the organization"
    },
    "Network Mapping Completeness": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-07",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "Asset criticality, locations, network connections, and custodians are documented"
    },
    "Network Segmentation Discovery": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-07",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "Asset criticality, locations, network connections, and custodians are documented"
    },
    "Supply Chain Visibility Score": {
        "csf_category_code": "ID.RA",
        "csf_subcategory_code": "ID.RA-10",
        "csf_category_name": "Risk Assessment",
        "csf_subcategory_outcome": "Critical suppliers are assessed prior to acquisition"
    },
    "Business Impact Analysis Coverage": {
        "csf_category_code": "ID.RA",
        "csf_subcategory_code": "ID.RA-04",
        "csf_category_name": "Risk Assessment",
        "csf_subcategory_outcome": "Potential impacts and consequences of threats exploiting vulnerabilities are identified and characterized"
    },
    "External Dependencies Documentation": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-04",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "External information systems and services are cataloged"
    },
    "Identity Provider Integration Coverage": {
        "csf_category_code": "ID.AM",
        "csf_subcategory_code": "ID.AM-04",
        "csf_category_name": "Asset Management",
        "csf_subcategory_outcome": "External information systems and services are cataloged"
    },
    "Vendor Security Rating Timeliness": {
        "csf_category_code": "ID.RA",
        "csf_subcategory_code": "ID.RA-10",
        "csf_category_name": "Risk Assessment",
        "csf_subcategory_outcome": "Critical suppliers are assessed prior to acquisition"
    },

    # PROTECT FUNCTION - Missing 12 metrics  
    "Zero Trust Architecture Implementation": {
        "csf_category_code": "PR.AA",
        "csf_subcategory_code": "PR.AA-05",
        "csf_category_name": "Identity Management, Authentication and Access Control",
        "csf_subcategory_outcome": "Access grants are time-bounded, risk-based, and need-to-know"
    },
    "Certificate Management Compliance": {
        "csf_category_code": "PR.DS",
        "csf_subcategory_code": "PR.DS-06",
        "csf_category_name": "Data Security",
        "csf_subcategory_outcome": "The integrity of software, firmware, and information is verified using integrity verification mechanisms"
    },
    "Distributed Denial of Service Protection": {
        "csf_category_code": "PR.PT",
        "csf_subcategory_code": "PR.PT-05",
        "csf_category_name": "Protective Technology",
        "csf_subcategory_outcome": "Mechanisms are implemented to achieve resilience requirements during normal operations and in adverse situations"
    },
    "Mobile Device Management Enrollment": {
        "csf_category_code": "PR.AA",
        "csf_subcategory_code": "PR.AA-01",
        "csf_category_name": "Identity Management, Authentication and Access Control",
        "csf_subcategory_outcome": "Identities and credentials for authorized users are established, provisioned, managed, verified, revoked, and audited for physical and logical assets"
    },
    "Network Segmentation Compliance": {
        "csf_category_code": "PR.PT",
        "csf_subcategory_code": "PR.PT-04",
        "csf_category_name": "Protective Technology",
        "csf_subcategory_outcome": "System and network communications are protected"
    },
    "Password Policy Compliance": {
        "csf_category_code": "PR.AA",
        "csf_subcategory_code": "PR.AA-02",
        "csf_category_name": "Identity Management, Authentication and Access Control", 
        "csf_subcategory_outcome": "Identities are proofed and bound to credentials based on the organization's risk management strategy"
    },
    "Secure Software Development Lifecycle": {
        "csf_category_code": "PR.IP",
        "csf_subcategory_code": "PR.IP-06",
        "csf_category_name": "Information Protection Processes and Procedures",
        "csf_subcategory_outcome": "Secure software development practices are integrated, and their performance is monitored throughout the software development life cycle"
    },
    "Threat Modeling Coverage": {
        "csf_category_code": "PR.IP",
        "csf_subcategory_code": "PR.IP-02",
        "csf_category_name": "Information Protection Processes and Procedures",
        "csf_subcategory_outcome": "System development lifecycle processes include security considerations"
    },
    "File Integrity Monitoring Coverage": {
        "csf_category_code": "PR.DS",
        "csf_subcategory_code": "PR.DS-06",
        "csf_category_name": "Data Security",
        "csf_subcategory_outcome": "The integrity of software, firmware, and information is verified using integrity verification mechanisms"
    },
    "Incident Response Automation Coverage": {
        "csf_category_code": "PR.IP",
        "csf_subcategory_code": "PR.IP-08",
        "csf_category_name": "Information Protection Processes and Procedures",
        "csf_subcategory_outcome": "Incident response plans and other cybersecurity plans that affect operations are established, communicated, maintained, and improved"
    },
    "Software Composition Analysis Coverage": {
        "csf_category_code": "PR.IP",
        "csf_subcategory_code": "PR.IP-07",
        "csf_category_name": "Information Protection Processes and Procedures",
        "csf_subcategory_outcome": "The organization's security testing program includes the use of various testing techniques, and findings are remediated"
    },
    "Web Application Firewall Coverage": {
        "csf_category_code": "PR.PT",
        "csf_subcategory_code": "PR.PT-04",
        "csf_category_name": "Protective Technology",
        "csf_subcategory_outcome": "System and network communications are protected"
    },

    # DETECT FUNCTION - Missing 6 metrics
    "Security Operations Center Staffing": {
        "csf_category_code": "DE.CM",
        "csf_subcategory_code": "DE.CM-01",
        "csf_category_name": "Continuous Security Monitoring",
        "csf_subcategory_outcome": "Networks and network services are monitored"
    },
    "Threat Hunting Success Rate": {
        "csf_category_code": "DE.AE",
        "csf_subcategory_code": "DE.AE-02",
        "csf_category_name": "Anomalies and Events", 
        "csf_subcategory_outcome": "Potentially malicious activity is analyzed to understand impact and to determine if it is an incident"
    },
    "Threat Intelligence Integration": {
        "csf_category_code": "DE.AE",
        "csf_subcategory_code": "DE.AE-03",
        "csf_category_name": "Anomalies and Events",
        "csf_subcategory_outcome": "Information from detection activities is shared appropriately"
    },
    "Web Security Gateway Effectiveness": {
        "csf_category_code": "DE.CM",
        "csf_subcategory_code": "DE.CM-04",
        "csf_category_name": "Continuous Security Monitoring",
        "csf_subcategory_outcome": "Network communications are monitored"
    },
    "Security Information Sharing Effectiveness": {
        "csf_category_code": "DE.AE",
        "csf_subcategory_code": "DE.AE-03",
        "csf_category_name": "Anomalies and Events",
        "csf_subcategory_outcome": "Information from detection activities is shared appropriately"
    },
    "Security Metrics Dashboard Utilization": {
        "csf_category_code": "DE.AE",
        "csf_subcategory_code": "DE.AE-05",
        "csf_category_name": "Anomalies and Events",
        "csf_subcategory_outcome": "Incident alerting and reporting processes are established"
    },

    # RESPOND FUNCTION - Missing 1 metric
    "Threat Hunt Execution": {
        "csf_category_code": "RS.AN",
        "csf_subcategory_code": "RS.AN-03",
        "csf_category_name": "Analysis",
        "csf_subcategory_outcome": "Analysis is performed to establish what has taken place during an incident and the root cause of the incident"
    },

    # RECOVER FUNCTION - Missing 3 metrics
    "Alternate Site Readiness": {
        "csf_category_code": "RC.RP",
        "csf_subcategory_code": "RC.RP-01",
        "csf_category_name": "Recovery Planning",
        "csf_subcategory_outcome": "Recovery objectives and priorities are established based on applicable laws, regulations, or policies, and organizational risk tolerance"
    },
    "Business Impact Analysis Accuracy": {
        "csf_category_code": "RC.RP",
        "csf_subcategory_code": "RC.RP-01",
        "csf_category_name": "Recovery Planning", 
        "csf_subcategory_outcome": "Recovery objectives and priorities are established based on applicable laws, regulations, or policies, and organizational risk tolerance"
    },
    "Communication System Redundancy": {
        "csf_category_code": "RC.CO",
        "csf_subcategory_code": "RC.CO-01",
        "csf_category_name": "Communications",
        "csf_subcategory_outcome": "Recovery activities are coordinated with internal and external stakeholders (e.g. coordinating centers, Internet Service Providers, owners of attacking systems, victims, other CSIRTs, and vendors)"
    }
}