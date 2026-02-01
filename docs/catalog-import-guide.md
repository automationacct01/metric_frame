# Bring Your Own Catalog - User Guide

## Overview

MetricFrame supports importing custom metrics catalogs and mapping them to either **NIST Cybersecurity Framework 2.0** or **NIST AI Risk Management Framework 1.0**. This allows organizations to use their own metrics while maintaining compatibility with NIST framework scoring and visualization.

## Supported Frameworks

| Framework | Functions | Use Case |
|-----------|-----------|----------|
| **NIST CSF 2.0** | Govern, Identify, Protect, Detect, Respond, Recover | Cybersecurity risk metrics |
| **NIST AI RMF 1.0** | Govern, Map, Measure, Manage | AI/ML risk metrics |

## Features

- **Multi-Framework Support**: Map metrics to CSF 2.0 or AI RMF 1.0
- **File Import**: Upload CSV or JSON files containing your metrics
- **AI-Powered Mapping**: Automatic suggestions for mapping your metrics to framework functions
- **Framework-Specific IDs**: Automatic metric ID generation (e.g., `CSF-PR-001`, `AIRMF-GOVERN-001`)
- **Manual Override**: Edit and customize mappings as needed
- **Seamless Integration**: Switch between catalogs without losing dashboard functionality
- **Audit Trail**: Track changes and mapping decisions

## Getting Started

### 1. Prepare Your Metrics File

#### Required Fields

Your CSV/JSON file must include these fields:

- `name` - Metric name (required)
- `direction` - Scoring direction: `higher_is_better`, `lower_is_better`, `target_range`, or `binary` (required)

#### Recommended Fields

- `target_value` - Target performance value
- `description` - Metric description
- `current_value` - Current metric value
- `priority_rank` - Priority level (1=High, 2=Medium, 3=Low)
- `weight` - Weighting factor for scoring (default: 1.0)
- `owner_function` - Responsible team
- `data_source` - Source of metric data

#### Sample CSV Format

```csv
metric_id,name,description,direction,target_value,target_units,priority_rank,weight,owner_function,data_source,current_value
SEC-001,Multi-Factor Authentication Coverage,Percentage of user accounts protected with MFA,higher_is_better,100.0,%,1,1.0,IAM,Identity Management System,85.5
SEC-002,Mean Time to Detect Critical Incidents,Average time to detect high-severity security incidents,lower_is_better,4.0,hours,1,1.0,SOC,SIEM Platform,6.2
```

### 2. Import Process

1. **Navigate to Import Wizard**
   - Click "Import Catalog" in the navigation menu
   - Or visit `/catalog-wizard` directly

2. **Upload File (Step 1)**
   - **Select Target Framework**: Choose NIST CSF 2.0 or NIST AI RMF 1.0
   - **Catalog Name**: Provide a descriptive name
   - **Description**: Optional description of your metrics
   - **Upload File**: Drag and drop your CSV/JSON file
   - Click "Next" to process the file

3. **Map Fields (Step 2)** - Optional
   - Map your file columns to standard metric fields
   - Required fields must be mapped to proceed
   - Skip this step if your columns match the expected names

4. **Map to Framework Functions (Step 3)**
   - Review AI-generated mapping suggestions for your selected framework
   - For CSF 2.0: Maps to Govern, Identify, Protect, Detect, Respond, Recover
   - For AI RMF: Maps to Govern, Map, Measure, Manage
   - Edit mappings manually if needed
   - Click "Accept All" or confirm individual mappings
   - **Note**: Metric IDs are automatically generated based on the framework (e.g., `CSF-PR-001`, `AIRMF-GOVERN-001`)

5. **Enhance Metrics (Step 4)** - Optional
   - Review AI-powered enhancement suggestions
   - Accept suggestions to improve metric descriptions, priorities, and targets

6. **Confirm & Activate (Step 5)**
   - Review the summary of imported metrics
   - Click "Activate Catalog" to make it the active metrics source

### 3. Managing Catalogs

#### Switching Between Catalogs

- Use the catalog selector in the dashboard header
- Or visit "Manage Catalogs" to see all available catalogs
- Only one catalog can be active at a time

#### Returning to Default Metrics

- Select "Default Metrics" in the catalog selector for the active framework
- Or deactivate your custom catalog in "Manage Catalogs"
- Default catalogs are available for both CSF 2.0 (276 metrics) and AI RMF (80 metrics)

## Best Practices

### Metric Design

1. **Clear Names**: Use descriptive, unambiguous metric names
2. **Proper Direction**: Choose the correct scoring direction:
   - `higher_is_better`: Compliance rates, coverage percentages
   - `lower_is_better`: Response times, incident counts
   - `target_range`: Metrics with optimal ranges
   - `binary`: Pass/fail, yes/no metrics

3. **Realistic Targets**: Set achievable but challenging target values
4. **Consistent Units**: Use standard units (%, hours, days, count)

### Framework Mapping

1. **Choose the Right Framework**:
   - Use CSF 2.0 for cybersecurity metrics (vulnerability management, access control, incident response)
   - Use AI RMF for AI/ML metrics (model governance, bias detection, AI risk assessment)
2. **Primary Function**: Map each metric to its primary framework function
3. **Specific Categories**: Use specific categories when known:
   - CSF 2.0: PR.AA, ID.AM, DE.CM, etc.
   - AI RMF: GOVERN-1, MAP-2, MEASURE-3, MANAGE-4, etc.
4. **Review AI Suggestions**: AI mappings are generally accurate but review for your context
5. **Document Rationale**: Add mapping notes to explain your decisions

### File Organization

1. **Consistent Format**: Use the same column names across files
2. **Version Control**: Include version numbers or dates in catalog names
3. **Backup**: Keep copies of your source files
4. **Documentation**: Document your metrics and their calculation methods

## Troubleshooting

### Common Import Issues

**"Invalid direction" error**
- Check that direction values are one of: higher_is_better, lower_is_better, target_range, binary
- Use lowercase and underscores

**"Please map required field" error**
- Ensure 'name' and 'direction' columns are mapped
- Check that your file has headers in the first row

**"No metrics mapped to framework" warning**
- At least one metric must have a framework mapping to generate scores
- Review and confirm mappings in Step 3 (Map to Framework Functions)

### Performance Considerations

- **File Size**: Files up to 10MB are supported
- **Metric Count**: Recommended maximum of 500 metrics per catalog
- **Processing Time**: Large files may take 1-2 minutes to process

### Data Validation

The system validates:
- Required fields are present
- Direction values are valid
- Numeric fields contain valid numbers
- Target values are reasonable for the direction type

## API Reference

For programmatic access, see the catalog management API endpoints:

- `GET /api/v1/catalogs/` - List catalogs
- `POST /api/v1/catalogs/upload` - Upload new catalog
- `POST /api/v1/catalogs/{id}/activate` - Activate catalog
- `GET /api/v1/scores/?catalog_id={id}` - Get scores for specific catalog

## Support

For additional help:
1. Check the sample CSV file in `/backend/tests/fixtures/sample_catalog.csv`
2. Review error messages in the import wizard
3. Use the AI Assistant for metric-related questions
4. Contact your system administrator for technical issues