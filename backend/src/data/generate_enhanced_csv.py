#!/usr/bin/env python3
"""Generate enhanced CSV with CSF mappings for metrics."""

import csv
import json
import re
from pathlib import Path
from typing import Dict, List

def load_csf_reference():
    """Load CSF reference data."""
    data_path = Path(__file__).parent / "nist_csf_2_0_reference.json"
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_manual_mappings() -> Dict[str, Dict[str, str]]:
    """Create manual mappings for metrics based on NIST CSF 2.0."""
    return {
        # Govern - Organizational Context & Policy
        "Board Cyber Briefing Frequency": {
            "csf_category_code": "GV.OC", 
            "csf_subcategory_code": "GV.OC-05",
            "csf_category_name": "Organizational Context",
            "csf_subcategory_outcome": "Outcomes, roles, and responsibilities for cybersecurity risk management are established, communicated, and enforced"
        },
        "Policy Compliance Rate": {
            "csf_category_code": "GV.PO",
            "csf_subcategory_code": "GV.PO-01", 
            "csf_category_name": "Policy",
            "csf_subcategory_outcome": "Policy for cybersecurity is established based on organizational context, cybersecurity strategy, and priorities and is communicated throughout the organization"
        },
        "Cybersecurity Budget Allocation": {
            "csf_category_code": "GV.OC",
            "csf_subcategory_code": "GV.OC-02",
            "csf_category_name": "Organizational Context", 
            "csf_subcategory_outcome": "The organizational structure and resource allocation for cybersecurity are understood"
        },
        "Risk Assessment Frequency": {
            "csf_category_code": "GV.RM",
            "csf_subcategory_code": "GV.RM-01",
            "csf_category_name": "Risk Management Strategy",
            "csf_subcategory_outcome": "Cybersecurity risk management strategy is established, communicated, and enforced throughout the organization"
        },
        "Security Training Completion Rate": {
            "csf_category_code": "PR.AT",
            "csf_subcategory_code": "PR.AT-01", 
            "csf_category_name": "Awareness and Training",
            "csf_subcategory_outcome": "Personnel are trained to perform their cybersecurity-related duties and responsibilities consistent with organizational policies, standards, and procedures"
        },
        "Third-Party Risk Assessments": {
            "csf_category_code": "GV.SC",
            "csf_subcategory_code": "GV.SC-04",
            "csf_category_name": "Supply Chain Risk Management",
            "csf_subcategory_outcome": "Suppliers are evaluated and selected based on their security posture and ability to meet contractual cybersecurity requirements"
        },
        
        # Identify - Asset Management & Risk Assessment
        "Asset Inventory Accuracy": {
            "csf_category_code": "ID.AM",
            "csf_subcategory_code": "ID.AM-01",
            "csf_category_name": "Asset Management",
            "csf_subcategory_outcome": "Physical devices and systems are inventoried within the organization"
        },
        "Vulnerability Scan Coverage": {
            "csf_category_code": "ID.RA",
            "csf_subcategory_code": "ID.RA-03",
            "csf_category_name": "Risk Assessment",
            "csf_subcategory_outcome": "Internal and external vulnerabilities are identified and characterized"
        },
        "Critical Asset Identification": {
            "csf_category_code": "ID.AM",
            "csf_subcategory_code": "ID.AM-05",
            "csf_category_name": "Asset Management",
            "csf_subcategory_outcome": "Assets are prioritized based on their importance to business objectives and the organization's risk strategy"
        },
        
        # Protect - Access Control, Data Security, Training
        "MFA Adoption Rate": {
            "csf_category_code": "PR.AA",
            "csf_subcategory_code": "PR.AA-03",
            "csf_category_name": "Identity Management, Authentication and Access Control",
            "csf_subcategory_outcome": "Users, assets, and other subjects are authenticated prior to being granted access to systems and assets"
        },
        "Privileged Account Coverage": {
            "csf_category_code": "PR.AA",
            "csf_subcategory_code": "PR.AA-01",
            "csf_category_name": "Identity Management, Authentication and Access Control", 
            "csf_subcategory_outcome": "Identities and credentials for authorized users are established, provisioned, managed, verified, revoked, and audited for physical and logical assets"
        },
        "Access Review Frequency": {
            "csf_category_code": "PR.AA",
            "csf_subcategory_code": "PR.AA-06",
            "csf_category_name": "Identity Management, Authentication and Access Control",
            "csf_subcategory_outcome": "Physical and logical access to assets is revoked promptly when no longer needed"
        },
        "Data Encryption Coverage": {
            "csf_category_code": "PR.DS",
            "csf_subcategory_code": "PR.DS-01",
            "csf_category_name": "Data Security",
            "csf_subcategory_outcome": "The confidentiality, integrity, and availability of data-at-rest are protected"
        },
        "Backup Success Rate": {
            "csf_category_code": "PR.DS",
            "csf_subcategory_code": "PR.DS-09",
            "csf_category_name": "Data Security",
            "csf_subcategory_outcome": "The confidentiality of backup data is protected"
        },
        "Patch Management Compliance": {
            "csf_category_code": "PR.MA",
            "csf_subcategory_code": "PR.MA-01",
            "csf_category_name": "Maintenance",
            "csf_subcategory_outcome": "System maintenance, troubleshooting, and repair are performed using approved and controlled tools"
        },
        
        # Detect - Monitoring & Event Detection
        "Security Monitoring Coverage": {
            "csf_category_code": "DE.CM",
            "csf_subcategory_code": "DE.CM-01",
            "csf_category_name": "Continuous Security Monitoring",
            "csf_subcategory_outcome": "Networks and network services are monitored"
        },
        "Critical Vulnerability MTTD": {
            "csf_category_code": "DE.AE",
            "csf_subcategory_code": "DE.AE-01",
            "csf_category_name": "Anomalies and Events",
            "csf_subcategory_outcome": "Networks, systems, and assets are monitored to identify potentially malicious activity"
        },
        "Log Retention Compliance": {
            "csf_category_code": "DE.CM",
            "csf_subcategory_code": "DE.CM-01",
            "csf_category_name": "Continuous Security Monitoring",
            "csf_subcategory_outcome": "Networks and network services are monitored"
        },
        "SIEM Coverage": {
            "csf_category_code": "DE.AE",
            "csf_subcategory_code": "DE.AE-01",
            "csf_category_name": "Anomalies and Events",
            "csf_subcategory_outcome": "Networks, systems, and assets are monitored to identify potentially malicious activity"
        },
        
        # Respond - Incident Response
        "Mean Time to Respond": {
            "csf_category_code": "RS.MI",
            "csf_subcategory_code": "RS.MI-02",
            "csf_category_name": "Mitigation",
            "csf_subcategory_outcome": "The impact of incidents is reduced through coordinated response activities"
        },
        "Incident Response Plan Testing": {
            "csf_category_code": "RS.RP",
            "csf_subcategory_code": "RS.RP-01",
            "csf_category_name": "Response Planning",
            "csf_subcategory_outcome": "A response plan that addresses roles, responsibilities, and communication protocols during and after an incident is developed and implemented"
        },
        "Incident Detection Rate": {
            "csf_category_code": "RS.AN",
            "csf_subcategory_code": "RS.AN-01",
            "csf_category_name": "Analysis",
            "csf_subcategory_outcome": "The impact and scope of incidents are understood"
        },
        
        # Recover - Recovery Planning & Business Continuity
        "Business Continuity Test Frequency": {
            "csf_category_code": "RC.RP",
            "csf_subcategory_code": "RC.RP-01",
            "csf_category_name": "Recovery Planning",
            "csf_subcategory_outcome": "Recovery objectives and priorities are established based on applicable laws, regulations, or policies, and organizational risk tolerance"
        },
        "Disaster Recovery RTO": {
            "csf_category_code": "RC.RP",
            "csf_subcategory_code": "RC.RP-01",
            "csf_category_name": "Recovery Planning",
            "csf_subcategory_outcome": "Recovery objectives and priorities are established based on applicable laws, regulations, or policies, and organizational risk tolerance"
        },
        "Data Recovery Success Rate": {
            "csf_category_code": "RC.RP",
            "csf_subcategory_code": "RC.RP-01",
            "csf_category_name": "Recovery Planning",
            "csf_subcategory_outcome": "Recovery objectives and priorities are established based on applicable laws, regulations, or policies, and organizational risk tolerance"
        }
    }

def suggest_mapping_by_keywords(name: str, description: str, function: str) -> Dict[str, str]:
    """Suggest mapping based on keyword analysis."""
    text = f"{name} {description}".lower()
    
    # Function-based category mappings with keywords
    function_mappings = {
        "gv": {
            "policy|compliance|governance": ("GV.PO", "GV.PO-01", "Policy", "Policy for cybersecurity is established based on organizational context, cybersecurity strategy, and priorities and is communicated throughout the organization"),
            "budget|resource|allocation": ("GV.OC", "GV.OC-02", "Organizational Context", "The organizational structure and resource allocation for cybersecurity are understood"),
            "risk|assessment|management": ("GV.RM", "GV.RM-01", "Risk Management Strategy", "Cybersecurity risk management strategy is established, communicated, and enforced throughout the organization"),
            "vendor|supplier|third.party": ("GV.SC", "GV.SC-04", "Supply Chain Risk Management", "Suppliers are evaluated and selected based on their security posture and ability to meet contractual cybersecurity requirements"),
            "oversight|review|board": ("GV.OV", "GV.OV-01", "Oversight", "Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction")
        },
        "id": {
            "asset|inventory|hardware|software": ("ID.AM", "ID.AM-01", "Asset Management", "Physical devices and systems are inventoried within the organization"),
            "vulnerability|scan|assessment": ("ID.RA", "ID.RA-03", "Risk Assessment", "Internal and external vulnerabilities are identified and characterized"),
            "risk|assessment|threat": ("ID.RA", "ID.RA-05", "Risk Assessment", "Threats, vulnerabilities, impacts, and consequences are analyzed to determine risk")
        },
        "pr": {
            "access|authentication|mfa|privilege": ("PR.AA", "PR.AA-03", "Identity Management, Authentication and Access Control", "Users, assets, and other subjects are authenticated prior to being granted access to systems and assets"),
            "training|awareness|education": ("PR.AT", "PR.AT-01", "Awareness and Training", "Personnel are trained to perform their cybersecurity-related duties and responsibilities consistent with organizational policies, standards, and procedures"),
            "data|encryption|backup": ("PR.DS", "PR.DS-01", "Data Security", "The confidentiality, integrity, and availability of data-at-rest are protected"),
            "patch|maintenance|update": ("PR.MA", "PR.MA-01", "Maintenance", "System maintenance, troubleshooting, and repair are performed using approved and controlled tools"),
            "configuration|security|control": ("PR.PT", "PR.PT-02", "Protective Technology", "System security configurations are established, documented, implemented, maintained, and reviewed")
        },
        "de": {
            "monitoring|log|siem|coverage": ("DE.CM", "DE.CM-01", "Continuous Security Monitoring", "Networks and network services are monitored"),
            "detection|alert|event|anomaly": ("DE.AE", "DE.AE-01", "Anomalies and Events", "Networks, systems, and assets are monitored to identify potentially malicious activity")
        },
        "rs": {
            "response|incident|mttr": ("RS.MI", "RS.MI-02", "Mitigation", "The impact of incidents is reduced through coordinated response activities"),
            "communication|notification": ("RS.CO", "RS.CO-02", "Communications", "Communication with internal and external stakeholders occurs during incidents"),
            "analysis|investigation": ("RS.AN", "RS.AN-01", "Analysis", "The impact and scope of incidents are understood"),
            "plan|procedure|testing": ("RS.RP", "RS.RP-01", "Response Planning", "A response plan that addresses roles, responsibilities, and communication protocols during and after an incident is developed and implemented")
        },
        "rc": {
            "recovery|restore|rto|rpo": ("RC.RP", "RC.RP-01", "Recovery Planning", "Recovery objectives and priorities are established based on applicable laws, regulations, or policies, and organizational risk tolerance"),
            "business.continuity|disaster": ("RC.RP", "RC.RP-01", "Recovery Planning", "Recovery objectives and priorities are established based on applicable laws, regulations, or policies, and organizational risk tolerance"),
            "lesson|improvement": ("RC.IM", "RC.IM-01", "Improvements", "Recovery lessons learned are incorporated into updated response and recovery plans")
        }
    }
    
    if function in function_mappings:
        for pattern, (cat_code, sub_code, cat_name, sub_outcome) in function_mappings[function].items():
            if re.search(pattern, text):
                return {
                    "csf_category_code": cat_code,
                    "csf_subcategory_code": sub_code,
                    "csf_category_name": cat_name,
                    "csf_subcategory_outcome": sub_outcome
                }
    
    return {
        "csf_category_code": None,
        "csf_subcategory_code": None,
        "csf_category_name": None,
        "csf_subcategory_outcome": None
    }

def process_metrics_csv(input_path: Path, output_path: Path):
    """Process metrics CSV and add CSF mappings."""
    
    manual_mappings = create_manual_mappings()
    processed_metrics = []
    
    print(f"📊 Processing metrics from {input_path.name}...")
    
    with open(input_path, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            metric_name = row['name'].strip()
            description = row.get('description', '').strip()
            function = row['csf_function'].strip()
            
            # Check for manual mapping first
            if metric_name in manual_mappings:
                mapping = manual_mappings[metric_name]
                print(f"  ✅ Manual mapping: {metric_name} -> {mapping['csf_category_code']}")
            else:
                # Use keyword suggestion
                mapping = suggest_mapping_by_keywords(metric_name, description, function)
                if mapping['csf_category_code']:
                    print(f"  🤖 Auto mapping: {metric_name} -> {mapping['csf_category_code']}")
                else:
                    print(f"  ❓ No mapping: {metric_name}")
            
            # Add mappings to the row
            row.update(mapping)
            processed_metrics.append(row)
    
    # Write enhanced CSV
    if processed_metrics:
        fieldnames = list(processed_metrics[0].keys())
        
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(processed_metrics)
        
        print(f"✅ Enhanced CSV written to {output_path}")
    
    return processed_metrics

def main():
    """Main function."""
    print("🗺️  NIST CSF 2.0 Metrics Mapping Generator")
    print("=" * 50)
    
    # Process the main seed file
    script_dir = Path(__file__).parent
    seed_dir = script_dir.parent / "seeds"
    input_csv = seed_dir / "seed_metrics_200.csv"
    output_csv = seed_dir / "seed_metrics_200_enhanced.csv"
    
    if not input_csv.exists():
        print(f"❌ Input file not found: {input_csv}")
        return
    
    # Process metrics and add CSF mappings
    processed_metrics = process_metrics_csv(input_csv, output_csv)
    
    # Generate mapping statistics
    print(f"\n📈 Mapping Statistics:")
    total_metrics = len(processed_metrics)
    mapped_categories = sum(1 for m in processed_metrics if m.get('csf_category_code'))
    mapped_subcategories = sum(1 for m in processed_metrics if m.get('csf_subcategory_code'))
    
    print(f"  Total metrics: {total_metrics}")
    print(f"  Category mappings: {mapped_categories} ({mapped_categories/total_metrics*100:.1f}%)")
    print(f"  Subcategory mappings: {mapped_subcategories} ({mapped_subcategories/total_metrics*100:.1f}%)")
    
    print(f"\n🎉 CSF mapping generation completed!")
    print(f"Enhanced file ready: {output_csv}")

if __name__ == "__main__":
    main()