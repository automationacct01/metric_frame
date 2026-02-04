import React, { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  Check as CheckIcon,
  Edit as EditIcon,
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { apiClient } from '../../api/client';

interface CSFMappingStepProps {
  state: any;
  updateState: (updates: any) => void;
  error: string | null;
  frameworkCode?: string;
}

// NIST CSF 2.0 functions
const csfFunctions = [
  { code: 'gv', name: 'Govern', color: 'purple' },
  { code: 'id', name: 'Identify', color: 'blue' },
  { code: 'pr', name: 'Protect', color: 'green' },
  { code: 'de', name: 'Detect', color: 'orange' },
  { code: 'rs', name: 'Respond', color: 'red' },
  { code: 'rc', name: 'Recover', color: 'teal' },
];

// NIST AI RMF 1.0 functions
const aiRmfFunctions = [
  { code: 'govern', name: 'Govern', color: 'purple' },
  { code: 'map', name: 'Map', color: 'blue' },
  { code: 'measure', name: 'Measure', color: 'green' },
  { code: 'manage', name: 'Manage', color: 'orange' },
];

const CSFMappingStep: React.FC<CSFMappingStepProps> = ({ state, updateState, frameworkCode = 'csf_2_0' }) => {
  const [editingMapping, setEditingMapping] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingProgress, setMappingProgress] = useState(0);
  const [mappingStatus, setMappingStatus] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const loadingRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Select the appropriate functions based on framework
  const isAiRmf = frameworkCode === 'ai_rmf';
  const frameworkFunctions = isAiRmf ? aiRmfFunctions : csfFunctions;

  // Use actual suggestions from the wizard state (populated during upload)
  const suggestions = state.suggestedMappings || [];

  // Try to load mappings if none exist and we have a catalog ID
  useEffect(() => {
    if (suggestions.length === 0 && state.catalogId && !loadingMappings && !loadingRef.current) {
      handleRetryAIMapping();
    }
  }, [state.catalogId]); // Remove suggestions.length dependency to prevent duplicate calls

  const handleRetryAIMapping = async () => {
    if (!state.catalogId || loadingRef.current) return;
    
    loadingRef.current = true;
    setLoadingMappings(true);
    setMappingError(null);
    setMappingProgress(0);
    setMappingStatus(`Initializing AI mapping for ${state.parsedData?.length || 'multiple'} metrics...`);
    setEstimatedTime('This process may take 1-3 minutes depending on catalog size');
    
    // Create new AbortController for this operation
    abortControllerRef.current = new AbortController();
    
    try {
      // Smooth progress updates with linear progression
      let currentPhase = 0;
      const phases = [
        { status: 'Analyzing metric descriptions...', estimatedTime: 'This process may take 1-3 minutes', endProgress: 20 },
        { status: 'Mapping to NIST CSF 2.0 functions...', estimatedTime: 'Processing can take time for complex catalogs', endProgress: 40 },
        { status: 'Evaluating confidence scores...', estimatedTime: 'Please be patient while AI analyzes metrics', endProgress: 60 },
        { status: 'Generating mapping reasoning...', estimatedTime: 'Almost complete...', endProgress: 80 },
        { status: 'Finalizing AI mappings...', estimatedTime: 'Final processing steps...', endProgress: 95 }
      ];
      
      const progressInterval = setInterval(() => {
        setMappingProgress(prev => {
          const targetProgress = phases[currentPhase]?.endProgress || 95;
          const increment = 0.5; // Steady 0.5% increment every second
          const next = Math.min(prev + increment, targetProgress);
          
          // Update status when reaching phase milestones
          if (next >= targetProgress && currentPhase < phases.length - 1) {
            currentPhase++;
            const phase = phases[currentPhase];
            if (phase) {
              setMappingStatus(phase.status);
              setEstimatedTime(phase.estimatedTime);
            }
          }
          
          return next;
        });
      }, 1000);
      
      const mappings = await apiClient.getCatalogMappings(state.catalogId, frameworkCode, abortControllerRef.current.signal);
      
      clearInterval(progressInterval);
      setMappingProgress(100);
      setMappingStatus('AI mappings completed successfully!');
      setEstimatedTime('');
      
      updateState({ suggestedMappings: mappings });
      
      // Show success for a moment before hiding progress
      setTimeout(() => {
        setLoadingMappings(false);
        setMappingProgress(0);
        setMappingStatus('');
      }, 1500);
      
    } catch (error: any) {
      // Check if the error was due to cancellation
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        setMappingError('AI mapping was cancelled by user');
        setMappingStatus('Mapping cancelled');
      } else {
        setMappingError(error.response?.data?.detail || error.message || 'Failed to generate AI mappings');
        setMappingStatus('Mapping failed');
      }
      setEstimatedTime('');
      setLoadingMappings(false);
      setMappingProgress(0);
    } finally {
      loadingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const handleCancelMapping = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setMappingStatus('Cancelling...');
    }
  };

  const handleAcceptMapping = (suggestion: any) => {
    const mapping = {
      catalog_item_id: suggestion.catalog_item_id,
      csf_function: suggestion.suggested_function,
      csf_category_code: suggestion.suggested_category,
      csf_subcategory_code: suggestion.suggested_subcategory,
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

  const handleCreateManualMapping = () => {
    // Create a mock suggestion for manual mapping
    const mockSuggestion = {
      catalog_item_id: 'manual-' + Date.now(),
      metric_name: 'Manual Mapping',
      suggested_function: 'gv',
      suggested_category: '',
      confidence_score: 1.0,
      reasoning: 'Manual mapping'
    };
    
    setEditingMapping(mockSuggestion);
    setDialogOpen(true);
  };

  const isMetricMapped = (metricId: string) => {
    return state.confirmedMappings?.some((m: any) => m.catalog_item_id === metricId);
  };

  const getFunctionInfo = (code: string) => {
    // Search in both function lists to handle any framework
    const found = frameworkFunctions.find(f => f.code === code) ||
                  csfFunctions.find(f => f.code === code) ||
                  aiRmfFunctions.find(f => f.code === code);
    return found || { name: code, color: 'default' };
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'success';
    if (score >= 0.8) return 'warning';
    return 'error';
  };

  // Get framework display name
  const frameworkName = frameworkCode === 'ai_rmf' ? 'NIST AI RMF' : 'NIST CSF 2.0';

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Map Metrics to {frameworkName}
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Our AI has analyzed your metrics and suggested {frameworkName} function mappings.
        Review and confirm these suggestions, or edit them manually.
      </Typography>

      {mappingError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>AI Mapping Failed</AlertTitle>
          {mappingError.includes('cancelled') 
            ? 'AI mapping was cancelled. You can retry or create mappings manually below.'
            : mappingError.includes('timeout') 
            ? 'AI mapping took longer than expected. The service may be busy. You can retry or create mappings manually below.'
            : `${mappingError}. You can retry AI mapping or create mappings manually below.`
          }
        </Alert>
      ) : suggestions.length > 0 ? (
        <Alert severity="info" icon={<PsychologyIcon />} sx={{ mb: 3 }}>
          <AlertTitle>AI-Powered Mapping</AlertTitle>
          We've analyzed your metric names and descriptions to suggest the best CSF function mappings. 
          Higher confidence scores indicate stronger AI confidence in the suggestion.
        </Alert>
      ) : loadingMappings ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Generating AI Mappings</AlertTitle>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {mappingStatus}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round(mappingProgress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={mappingProgress} 
              sx={{ height: 8, borderRadius: 4, mb: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {estimatedTime}
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={handleCancelMapping}
                disabled={!abortControllerRef.current}
                sx={{ ml: 2, minWidth: '80px' }}
              >
                Stop
              </Button>
            </Box>
          </Box>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>No AI Mappings Available</AlertTitle>
          AI mapping generation failed or is unavailable. You can retry or create mappings manually.
        </Alert>
      )}

      {/* Mapping Progress */}
      <Box sx={{ mb: 3, mx: -10, px: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1">
            Mapping Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {state.confirmedMappings?.length || 0} of {suggestions.length} metrics accepted
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={suggestions.length > 0 ? ((state.confirmedMappings?.length || 0) / suggestions.length) * 100 : 0}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Accept All Button - Top */}
      {suggestions.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => {
              // Accept all unmapped suggestions
              const newMappings = suggestions
                .filter((s: any) => !isMetricMapped(s.catalog_item_id))
                .map((s: any) => ({
                  catalog_item_id: s.catalog_item_id,
                  csf_function: s.suggested_function,
                  csf_category_code: s.suggested_category,
                  csf_subcategory_code: s.suggested_subcategory,
                  confidence_score: s.confidence_score,
                  mapping_method: 'auto',
                  mapping_notes: s.reasoning,
                }));

              updateState({
                confirmedMappings: [...(state.confirmedMappings || []), ...newMappings]
              });
            }}
            disabled={(state.confirmedMappings?.length || 0) === suggestions.length}
          >
            Accept All
          </Button>
        </Box>
      )}

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
            {suggestions.length === 0 && !loadingMappings ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No AI mapping suggestions available. Use the buttons below to retry AI mapping or create manual mappings.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              suggestions.map((suggestion: any) => (
              <TableRow
                key={suggestion.catalog_item_id}
                sx={{ 
                  opacity: isMetricMapped(suggestion.catalog_item_id) ? 0.6 : 1,
                  backgroundColor: isMetricMapped(suggestion.catalog_item_id) ? 'action.hover' : 'inherit'
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {suggestion.metric_name}
                    </Typography>
                    {isMetricMapped(suggestion.catalog_item_id) && (
                      <Chip size="small" label="Mapped" color="success" sx={{ alignSelf: 'flex-start' }} />
                    )}
                  </Box>
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        {suggestions.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => {
              // Accept all unmapped suggestions
              const newMappings = suggestions
                .filter((s: any) => !isMetricMapped(s.catalog_item_id))
                .map((s: any) => ({
                  catalog_item_id: s.catalog_item_id,
                  csf_function: s.suggested_function,
                  csf_category_code: s.suggested_category,
                  csf_subcategory_code: s.suggested_subcategory,
                  confidence_score: s.confidence_score,
                  mapping_method: 'auto',
                  mapping_notes: s.reasoning,
                }));

              updateState({
                confirmedMappings: [...(state.confirmedMappings || []), ...newMappings]
              });
            }}
            disabled={(state.confirmedMappings?.length || 0) === suggestions.length}
          >
            Accept All
          </Button>
        )}

        {(suggestions.length === 0 && !loadingMappings) && (
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRetryAIMapping}
              disabled={!state.catalogId}
            >
              Retry AI Mapping
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateManualMapping}
            >
              Create Manual Mapping
            </Button>
          </>
        )}
      </Box>

      {/* Edit Mapping Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit {isAiRmf ? 'AI RMF' : 'CSF'} Mapping</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Manually adjust the {isAiRmf ? 'AI RMF' : 'CSF'} mapping for: <strong>{editingMapping?.metric_name}</strong>
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>{isAiRmf ? 'AI RMF Function' : 'CSF Function'}</InputLabel>
            <Select
              value={editingMapping?.csf_function || ''}
              label={isAiRmf ? 'AI RMF Function' : 'CSF Function'}
              onChange={(e) => setEditingMapping((prev: any) => ({ ...prev, csf_function: e.target.value }))}
            >
              {frameworkFunctions.map((func) => (
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