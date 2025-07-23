import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  AlertTitle,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Check as CheckIcon,
  Edit as EditIcon,
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

interface CSFMappingStepProps {
  state: any;
  updateState: (updates: any) => void;
  error: string | null;
}

const csfFunctions = [
  { code: 'gv', name: 'Govern', color: 'purple' },
  { code: 'id', name: 'Identify', color: 'blue' },
  { code: 'pr', name: 'Protect', color: 'green' },
  { code: 'de', name: 'Detect', color: 'orange' },
  { code: 'rs', name: 'Respond', color: 'red' },
  { code: 'rc', name: 'Recover', color: 'teal' },
];

const CSFMappingStep: React.FC<CSFMappingStepProps> = ({ state, updateState }) => {
  const [editingMapping, setEditingMapping] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use actual suggestions from the wizard state (populated during upload)
  const suggestions = state.suggestedMappings || [];

  const handleAcceptMapping = (suggestion: any) => {
    const mapping = {
      catalog_item_id: suggestion.catalog_item_id,
      csf_function: suggestion.suggested_function,
      csf_category_code: suggestion.suggested_category,
      confidence_score: suggestion.confidence_score,
      mapping_method: 'auto',
      mapping_notes: suggestion.reasoning,
    };

    updateState({
      confirmedMappings: [...(state.confirmedMappings || []), mapping]
    });
  };

  const handleEditMapping = (suggestion: any) => {
    setEditingMapping({
      ...suggestion,
      csf_function: suggestion.suggested_function,
      csf_category_code: suggestion.suggested_category,
    });
    setDialogOpen(true);
  };

  const handleSaveEditedMapping = () => {
    if (editingMapping) {
      const mapping = {
        catalog_item_id: editingMapping.catalog_item_id,
        csf_function: editingMapping.csf_function,
        csf_category_code: editingMapping.csf_category_code,
        confidence_score: 1.0, // Manual mapping gets full confidence
        mapping_method: 'manual',
        mapping_notes: editingMapping.mapping_notes || 'Manually adjusted mapping',
      };

      updateState({
        confirmedMappings: [...(state.confirmedMappings || []), mapping]
      });
    }
    
    setDialogOpen(false);
    setEditingMapping(null);
  };

  const isMetricMapped = (metricId: string) => {
    return state.confirmedMappings?.some((m: any) => m.catalog_item_id === metricId);
  };

  const getFunctionInfo = (code: string) => {
    return csfFunctions.find(f => f.code === code) || { name: code, color: 'default' };
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'success';
    if (score >= 0.8) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Map Metrics to NIST CSF 2.0
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Our AI has analyzed your metrics and suggested NIST CSF 2.0 function mappings. 
        Review and confirm these suggestions, or edit them manually.
      </Typography>

      <Alert severity="info" icon={<PsychologyIcon />} sx={{ mb: 3 }}>
        <AlertTitle>AI-Powered Mapping</AlertTitle>
        We've analyzed your metric names and descriptions to suggest the best CSF function mappings. 
        Higher confidence scores indicate stronger AI confidence in the suggestion.
      </Alert>

      {/* Mapping Progress */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1">
            Mapping Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {state.confirmedMappings?.length || 0} of {suggestions.length} metrics mapped
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={suggestions.length > 0 ? ((state.confirmedMappings?.length || 0) / suggestions.length) * 100 : 0}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Paper>

      {/* Suggested Mappings Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Metric Name</TableCell>
              <TableCell>Suggested Function</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>AI Reasoning</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suggestions.map((suggestion) => (
              <TableRow 
                key={suggestion.catalog_item_id}
                sx={{ 
                  opacity: isMetricMapped(suggestion.catalog_item_id) ? 0.6 : 1,
                  backgroundColor: isMetricMapped(suggestion.catalog_item_id) ? 'action.hover' : 'inherit'
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {suggestion.metric_name}
                  </Typography>
                  {isMetricMapped(suggestion.catalog_item_id) && (
                    <Chip size="small" label="Mapped" color="success" sx={{ mt: 0.5 }} />
                  )}
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={`${getFunctionInfo(suggestion.suggested_function).name} (${suggestion.suggested_function.toUpperCase()})`}
                    size="small"
                    sx={{ 
                      backgroundColor: `${getFunctionInfo(suggestion.suggested_function).color}.100`,
                      color: `${getFunctionInfo(suggestion.suggested_function).color}.800`
                    }}
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {suggestion.suggested_category || 'Auto-assigned'}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={`${(suggestion.confidence_score * 100).toFixed(0)}%`}
                    size="small"
                    color={getConfidenceColor(suggestion.confidence_score)}
                    variant="outlined"
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                    {suggestion.reasoning}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Accept AI suggestion">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleAcceptMapping(suggestion)}
                        disabled={isMetricMapped(suggestion.catalog_item_id)}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Edit mapping">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditMapping(suggestion)}
                        disabled={isMetricMapped(suggestion.catalog_item_id)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Actions */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => {
            // Accept all unmapped suggestions
            const newMappings = suggestions
              .filter(s => !isMetricMapped(s.catalog_item_id))
              .map(s => ({
                catalog_item_id: s.catalog_item_id,
                csf_function: s.suggested_function,
                csf_category_code: s.suggested_category,
                confidence_score: s.confidence_score,
                mapping_method: 'auto',
                mapping_notes: s.reasoning,
              }));
            
            updateState({
              confirmedMappings: [...(state.confirmedMappings || []), ...newMappings]
            });
          }}
          disabled={suggestions.length === 0 || (state.confirmedMappings?.length || 0) === suggestions.length}
        >
          Accept All AI Suggestions
        </Button>
      </Box>

      {/* Edit Mapping Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit CSF Mapping</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Manually adjust the CSF mapping for: <strong>{editingMapping?.metric_name}</strong>
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>CSF Function</InputLabel>
            <Select
              value={editingMapping?.csf_function || ''}
              label="CSF Function"
              onChange={(e) => setEditingMapping((prev: any) => ({ ...prev, csf_function: e.target.value }))}
            >
              {csfFunctions.map((func) => (
                <MenuItem key={func.code} value={func.code}>
                  {func.name} ({func.code.toUpperCase()})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Category Code (Optional)"
            value={editingMapping?.csf_category_code || ''}
            onChange={(e) => setEditingMapping((prev: any) => ({ ...prev, csf_category_code: e.target.value }))}
            placeholder="e.g., PR.AA, ID.AM"
          />

          <TextField
            fullWidth
            margin="normal"
            label="Mapping Notes"
            value={editingMapping?.mapping_notes || ''}
            onChange={(e) => setEditingMapping((prev: any) => ({ ...prev, mapping_notes: e.target.value }))}
            multiline
            rows={3}
            placeholder="Explain why this mapping is appropriate..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEditedMapping} variant="contained">Save Mapping</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CSFMappingStep;