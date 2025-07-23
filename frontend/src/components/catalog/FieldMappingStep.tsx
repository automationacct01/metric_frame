import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Chip,
} from '@mui/material';

interface FieldMappingStepProps {
  state: any;
  updateState: (updates: any) => void;
  error: string | null;
}

const requiredFields = [
  { key: 'name', label: 'Metric Name', description: 'The name of the metric' },
  { key: 'direction', label: 'Direction', description: 'Scoring direction (higher_is_better, lower_is_better, etc.)' },
];

const optionalFields = [
  { key: 'description', label: 'Description', description: 'Metric description' },
  { key: 'target_value', label: 'Target Value', description: 'Target performance value' },
  { key: 'current_value', label: 'Current Value', description: 'Current metric value' },
  { key: 'priority_rank', label: 'Priority Rank', description: 'Priority level (1=High, 2=Medium, 3=Low)' },
  { key: 'weight', label: 'Weight', description: 'Weighting factor for scoring' },
  { key: 'owner_function', label: 'Owner Function', description: 'Responsible team or function' },
  { key: 'data_source', label: 'Data Source', description: 'Source of metric data' },
  { key: 'formula', label: 'Formula', description: 'Calculation method' },
  { key: 'target_units', label: 'Target Units', description: 'Units of measurement' },
  { key: 'tolerance_low', label: 'Tolerance Low', description: 'Lower tolerance bound' },
  { key: 'tolerance_high', label: 'Tolerance High', description: 'Upper tolerance bound' },
];

const FieldMappingStep: React.FC<FieldMappingStepProps> = ({ state, updateState }) => {
  // Mock parsed data - in real implementation, this would come from the uploaded file
  const sampleColumns = [
    'metric_name', 'description', 'target', 'current', 'direction_type', 
    'owner', 'source', 'priority', 'weight_factor', 'formula_text'
  ];

  const handleFieldMapping = (targetField: string, sourceColumn: string) => {
    updateState({
      fieldMappings: {
        ...state.fieldMappings,
        [targetField]: sourceColumn
      }
    });
  };

  const getFieldMappingColor = (field: string) => {
    const isRequired = requiredFields.some(f => f.key === field);
    const isMapped = Boolean(state.fieldMappings[field]);
    
    if (isRequired && !isMapped) return 'error';
    if (isRequired && isMapped) return 'success';
    if (!isRequired && isMapped) return 'primary';
    return 'default';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Map Your File Columns
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Map the columns in your uploaded file to our standard metric fields. 
        Required fields must be mapped to proceed.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Field Mapping</AlertTitle>
        We've detected {sampleColumns.length} columns in your file. 
        Map them to the corresponding metric fields below.
      </Alert>

      <Grid container spacing={3}>
        {/* Required Fields */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" color="error" gutterBottom>
              Required Fields
            </Typography>
            
            <Grid container spacing={2}>
              {requiredFields.map((field) => (
                <Grid item xs={12} md={6} key={field.key}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                      value={state.fieldMappings[field.key] || ''}
                      label={field.label}
                      onChange={(e) => handleFieldMapping(field.key, e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Select a column</em>
                      </MenuItem>
                      {sampleColumns.map((column) => (
                        <MenuItem key={column} value={column}>
                          {column}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {field.description}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Optional Fields */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Optional Fields
            </Typography>
            
            <Grid container spacing={2}>
              {optionalFields.map((field) => (
                <Grid item xs={12} md={6} lg={4} key={field.key}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                      value={state.fieldMappings[field.key] || ''}
                      label={field.label}
                      onChange={(e) => handleFieldMapping(field.key, e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Not mapped</em>
                      </MenuItem>
                      {sampleColumns.map((column) => (
                        <MenuItem key={column} value={column}>
                          {column}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {field.description}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Mapping Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Mapping Summary
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Target Field</TableCell>
                    <TableCell>Source Column</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...requiredFields, ...optionalFields].map((field) => (
                    <TableRow key={field.key}>
                      <TableCell>
                        <Typography variant="body2">
                          {field.label}
                          {requiredFields.some(f => f.key === field.key) && (
                            <Chip size="small" label="Required" color="error" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {state.fieldMappings[field.key] || 'Not mapped'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            state.fieldMappings[field.key] 
                              ? 'Mapped' 
                              : requiredFields.some(f => f.key === field.key)
                                ? 'Required'
                                : 'Optional'
                          }
                          color={getFieldMappingColor(field.key)}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FieldMappingStep;