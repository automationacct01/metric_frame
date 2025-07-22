#!/usr/bin/env python3
"""Generate CSF mappings for existing metrics based on intelligent analysis."""

import csv
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Load CSF reference data directly
def load_csf_reference():
    """Load CSF reference data directly from JSON file.""" 
    data_path = Path(__file__).parent / "nist_csf_2_0_reference.json"
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def analyze_metric_and_suggest_mapping(name: str, description: str, function: str) -> Dict[str, str]:
    """Analyze metric and suggest the best CSF category/subcategory mapping."""
    
    # Get category suggestions
    category_suggestions = csf_service.suggest_category_for_metric(name, description)
    
    # Filter suggestions by the metric's CSF function to ensure consistency
    function_categories = csf_service.get_category_codes_for_function(function)
    filtered_suggestions = [
        (code, name_str, score) for code, name_str, score in category_suggestions 
        if code in function_categories
    ]
    
    best_category = None
    best_subcategory = None
    
    if filtered_suggestions:
        # Take the highest scoring category that matches the function
        best_category = filtered_suggestions[0][0]
        
        # Get subcategory suggestions for the best category
        subcategory_suggestions = csf_service.suggest_subcategory_for_metric(
            name, description, best_category
        )
        
        if subcategory_suggestions:
            best_subcategory = subcategory_suggestions[0][0]
    
    # Get enriched data
    enriched_data = csf_service.enrich_metric_with_csf_data(best_category, best_subcategory)
    
    return {
        "csf_category_code": best_category,
        "csf_subcategory_code": best_subcategory,
        "csf_category_name": enriched_data.get("csf_category_name"),
        "csf_subcategory_outcome": enriched_data.get("csf_subcategory_outcome")
    }


def create_manual_mappings() -> Dict[str, Dict[str, str]]:
    """Create manual mappings for metrics that need specific CSF alignment."""
    return {
        # Govern - Organizational Context
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
        
        # Asset Management
        "Asset Inventory Accuracy": {
            "csf_category_code": "ID.AM",
            "csf_subcategory_code": "ID.AM-01",
            "csf_category_name": "Asset Management",
            "csf_subcategory_outcome": "Physical devices and systems are inventoried within the organization"
        },
        
        # Access Control
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
        
        # Vulnerability Management
        "Vulnerability Scan Coverage": {
            "csf_category_code": "DE.CM",
            "csf_subcategory_code": "DE.CM-08",
            "csf_category_name": "Continuous Security Monitoring",
            "csf_subcategory_outcome": "Vulnerability assessments are performed and findings remediated according to organizational priorities"
        },
        "Critical Vulnerability MTTD": {
            "csf_category_code": "DE.AE",
            "csf_subcategory_code": "DE.AE-01",
            "csf_category_name": "Anomalies and Events",
            "csf_subcategory_outcome": "Networks, systems, and assets are monitored to identify potentially malicious activity"
        },
        
        # Incident Response
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
        
        # Training
        "Security Training Completion Rate": {
            "csf_category_code": "PR.AT",
            "csf_subcategory_code": "PR.AT-01", 
            "csf_category_name": "Awareness and Training",
            "csf_subcategory_outcome": "Personnel are trained to perform their cybersecurity-related duties and responsibilities consistent with organizational policies, standards, and procedures"
        },
        
        # Data Protection
        "Backup Success Rate": {
            "csf_category_code": "PR.DS",
            "csf_subcategory_code": "PR.DS-09",
            "csf_category_name": "Data Security",
            "csf_subcategory_outcome": "The confidentiality of backup data is protected"
        },
        "Data Loss Prevention Coverage": {
            "csf_category_code": "PR.DS",
            "csf_subcategory_code": "PR.DS-01",
            "csf_category_name": "Data Security", 
            "csf_subcategory_outcome": "The confidentiality, integrity, and availability of data-at-rest are protected"
        },
        
        # Monitoring
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
        }
    }


def process_metrics_csv(csv_path: Path, output_path: Path):
    """Process metrics CSV and add CSF mappings."""
    
    manual_mappings = create_manual_mappings()
    processed_metrics = []
    
    print(f"📊 Processing metrics from {csv_path.name}...")
    
    with open(csv_path, 'r', newline='', encoding='utf-8') as csvfile:
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
                # Use AI suggestion
                mapping = analyze_metric_and_suggest_mapping(metric_name, description, function)
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
    """Main function to process metrics and create CSF mappings."""
    print("🗺️  NIST CSF 2.0 Metrics Mapping Generator")
    print("=" * 50)
    
    try:
        # Process the main seed file
        seed_dir = Path(__file__).parent.parent / "seeds"
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
        
        # Show function distribution
        print(f"\n🎯 Mappings by CSF Function:")
        function_stats = {}
        for metric in processed_metrics:
            func = metric['csf_function']
            if func not in function_stats:
                function_stats[func] = {'total': 0, 'mapped': 0}
            function_stats[func]['total'] += 1
            if metric.get('csf_category_code'):
                function_stats[func]['mapped'] += 1
        
        for func, stats in function_stats.items():
            pct = stats['mapped'] / stats['total'] * 100 if stats['total'] > 0 else 0
            print(f"  {func.upper()}: {stats['mapped']}/{stats['total']} ({pct:.1f}%)")
        
        print(f"\n🎉 CSF mapping generation completed!")
        print(f"Enhanced file ready: {output_csv}")
        
    except Exception as e:
        print(f"❌ Error during mapping generation: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()