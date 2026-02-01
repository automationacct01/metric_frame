import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// Available frameworks for catalog mapping
const AVAILABLE_FRAMEWORKS = [
  {
    code: 'csf_2_0',
    name: 'NIST Cybersecurity Framework 2.0',
    description: 'Map metrics to CSF 2.0 functions: Govern, Identify, Protect, Detect, Respond, Recover'
  },
  {
    code: 'ai_rmf',
    name: 'NIST AI Risk Management Framework 1.0',
    description: 'Map metrics to AI RMF functions: Govern, Map, Measure, Manage'
  },
];

interface FileUploadStepProps {
  state: any;
  updateState: (updates: any) => void;
  error: string | null;
}

const FileUploadStep: React.FC<FileUploadStepProps> = ({ state, updateState }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      updateState({
        uploadedFile: file,
        catalogName: state.catalogName || file.name.replace(/\.[^/.]+$/, "")
      });
    }
  }, [state.catalogName, updateState]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleFrameworkChange = (event: SelectChangeEvent<string>) => {
    updateState({ targetFramework: event.target.value });
  };

  const selectedFramework = AVAILABLE_FRAMEWORKS.find(f => f.code === state.targetFramework) || AVAILABLE_FRAMEWORKS[0];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upload Your Metrics Catalog
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Upload a CSV or JSON file containing your metrics.
        Select a target framework to map your metrics.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {/* Framework Selector - First */}
          <FormControl fullWidth>
            <InputLabel id="framework-select-label">Target Framework</InputLabel>
            <Select
              labelId="framework-select-label"
              id="framework-select"
              value={state.targetFramework || 'csf_2_0'}
              label="Target Framework"
              onChange={handleFrameworkChange}
            >
              {AVAILABLE_FRAMEWORKS.map((fw) => (
                <MenuItem key={fw.code} value={fw.code}>
                  {fw.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, mb: 2, display: 'block' }}>
            {selectedFramework.description}
          </Typography>

          {/* Catalog Name */}
          <TextField
            fullWidth
            label="Catalog Name"
            value={state.catalogName}
            onChange={(e) => updateState({ catalogName: e.target.value })}
            margin="normal"
            required
            helperText="A descriptive name for your metrics catalog"
          />

          {/* Description */}
          <TextField
            fullWidth
            label="Description"
            value={state.description}
            onChange={(e) => updateState({ description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            helperText="Optional description of your metrics and their purpose"
          />

          {/* File Upload Area - Last */}
          <Paper
            {...getRootProps()}
            sx={{
              p: 4,
              mt: 2,
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />

            {state.uploadedFile ? (
              <Box>
                <Typography variant="h6" color="primary" gutterBottom>
                  <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  File Selected
                </Typography>
                <Chip
                  icon={<DescriptionIcon />}
                  label={state.uploadedFile.name}
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {(state.uploadedFile.size / 1024).toFixed(1)} KB
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to browse files
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Supports CSV and JSON files up to 10MB
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          {/* File Format Guide */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Required Fields</AlertTitle>
            Your file should include these columns:
          </Alert>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="name" 
                secondary="Metric name (required)"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="direction" 
                secondary="higher_is_better, lower_is_better, target_range, or binary (required)"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="warning" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="target_value" 
                secondary="Target performance value (recommended)"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="action" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="description" 
                secondary="Metric description (optional)"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="action" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="current_value" 
                secondary="Current metric value (optional)"
              />
            </ListItem>
          </List>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>CSV Format Tips</AlertTitle>
            • Use comma-separated values
            • Include headers in the first row
            • Quote text fields containing commas
            • Use numeric values for targets and current values
          </Alert>
        </Grid>
      </Grid>

      {/* Upload Errors */}
      {state.uploadErrors && state.uploadErrors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <AlertTitle>Import Warnings</AlertTitle>
          <List dense>
            {state.uploadErrors.map((error: string, index: number) => (
              <ListItem key={index} dense>
                <ListItemIcon>
                  <ErrorIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={error} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
    </Box>
  );
};

export default FileUploadStep;