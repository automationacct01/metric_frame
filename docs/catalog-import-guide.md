# Bring Your Own Catalog - User Guide

## Overview

The NIST CSF 2.0 Metrics Dashboard supports importing custom cybersecurity metrics catalogs, allowing organizations to use their own metrics while maintaining compatibility with NIST Cybersecurity Framework 2.0 scoring and visualization.

## Features

- **File Import**: Upload CSV or JSON files containing your metrics
- **AI-Powered Mapping**: Automatic suggestions for mapping your metrics to NIST CSF 2.0 functions
- **Manual Override**: Edit and customize CSF mappings as needed
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

2. **Upload File**
   - Drag and drop your CSV/JSON file
   - Provide a catalog name and description
   - Click "Next" to process the file

3. **Map Fields** (if needed)
   - Map your file columns to standard metric fields
   - Required fields must be mapped to proceed

4. **Map to CSF Functions**
   - Review AI-generated mapping suggestions
   - Edit mappings manually if needed
   - Confirm mappings for metrics you want to include

5. **Activate Catalog**
   - Review the summary
   - Click "Activate Catalog" to make it the active metrics source

### 3. Managing Catalogs

#### Switching Between Catalogs

- Use the catalog selector in the dashboard header
- Or visit "Manage Catalogs" to see all available catalogs
- Only one catalog can be active at a time

#### Returning to Default Metrics

- Select "Default NIST CSF 2.0 Metrics" in the catalog selector
- Or deactivate your custom catalog in "Manage Catalogs"

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

### CSF Mapping

1. **Primary Function**: Map each metric to its primary CSF function
2. **Specific Categories**: Use specific CSF categories when known (e.g., PR.AA, ID.AM)
3. **Review AI Suggestions**: AI mappings are generally accurate but review for your context
4. **Document Rationale**: Add mapping notes to explain your decisions

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

**"No metrics mapped to CSF" warning**
- At least one metric must have a CSF mapping to generate scores
- Review and confirm mappings in step 3

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