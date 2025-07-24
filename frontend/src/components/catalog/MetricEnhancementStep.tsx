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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  LinearProgress,
} from '@mui/material';
import {
  Check as CheckIcon,
  Edit as EditIcon,
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { apiClient } from '../../api/client';

interface MetricEnhancementStepProps {
  state: any;
  updateState: (updates: any) => void;
  error: string | null;
}

const priorityLabels = {
  1: 'High',
  2: 'Medium', 
  3: 'Low'
};

const priorityColors = {
  1: 'error',
  2: 'warning',
  3: 'info'
};

const ownerFunctions = [
  'GRC', 'SecOps', 'IAM', 'IT Ops', 'IR', 'BCP', 'CISO'
];

const collectionFrequencies = [
  'daily', 'weekly', 'monthly', 'quarterly', 'ad_hoc'
];

const MetricEnhancementStep: React.FC<MetricEnhancementStepProps> = ({ state, updateState }) => {
  const [editingEnhancement, setEditingEnhancement] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingEnhancements, setLoadingEnhancements] = useState(false);
  const [enhancementError, setEnhancementError] = useState<string | null>(null);

  // Use enhanced suggestions from the wizard state
  const enhancements = state.enhancedMetrics || [];

  // Try to load enhancements if none exist and we have confirmed mappings
  useEffect(() => {
    if (enhancements.length === 0 && state.confirmedMappings?.length > 0 && state.catalogId && !loadingEnhancements) {
      handleGenerateEnhancements();
    }
  }, [state.confirmedMappings]);

  const handleGenerateEnhancements = async () => {
    if (!state.catalogId || !state.confirmedMappings?.length) return;
    
    setLoadingEnhancements(true);
    setEnhancementError(null);
    
    try {
      const enhancedMetrics = await apiClient.enhanceCatalogMetrics(state.catalogId);
      updateState({ enhancedMetrics });
    } catch (error: any) {
      setEnhancementError(error.response?.data?.detail || error.message || 'Failed to generate metric enhancements');
    } finally {
      setLoadingEnhancements(false);
    }
  };

  const handleAcceptEnhancement = (enhancement: any) => {
    updateState({
      acceptedEnhancements: [...(state.acceptedEnhancements || []), enhancement]
    });
  };

  const handleEditEnhancement = (enhancement: any) => {
    setEditingEnhancement(enhancement);
    setDialogOpen(true);
  };

  const handleSaveEditedEnhancement = () => {
    if (editingEnhancement) {
      updateState({
        acceptedEnhancements: [...(state.acceptedEnhancements || []), editingEnhancement]
      });
    }
    
    setDialogOpen(false);
    setEditingEnhancement(null);
  };

  const isMetricEnhanced = (metricId: string) => {
    return state.acceptedEnhancements?.some((e: any) => e.catalog_item_id === metricId);
  };

  const getAcceptedCount = () => {
    return state.acceptedEnhancements?.length || 0;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Enhance Metrics with AI
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Our AI will now analyze your mapped metrics and suggest detailed configurations including 
        priority levels, ownership, data sources, and collection frequencies.
      </Typography>

      {enhancementError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Enhancement Generation Failed</AlertTitle>
          {enhancementError}
        </Alert>
      ) : enhancements.length > 0 ? (
        <Alert severity="info" icon={<PsychologyIcon />} sx={{ mb: 3 }}>
          <AlertTitle>AI-Powered Metric Enhancement</AlertTitle>
          We've analyzed your metrics and CSF mappings to suggest optimal configurations 
          for priority, ownership, data sources, and collection schedules.
        </Alert>
      ) : loadingEnhancements ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Generating Metric Enhancements</AlertTitle>
          <Box sx={{ mt: 2 }}>
            <LinearProgress sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Analyzing your metrics to suggest optimal configurations...
            </Typography>
          </Box>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>No Enhancements Available</AlertTitle>
          Enhancement generation failed or is unavailable. You can retry or proceed to activate your catalog.
        </Alert>
      )}

      {/* Enhancement Progress */}
      <Box sx={{ mb: 3, mx: -10, px: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1">
            Enhancement Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getAcceptedCount()} of {enhancements.length} metrics enhanced
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={enhancements.length > 0 ? (getAcceptedCount() / enhancements.length) * 100 : 0}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Accept All Button - Top */}
      {enhancements.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => {
              // Accept all unenhnaced metrics
              const newEnhancements = enhancements
                .filter((e: any) => !isMetricEnhanced(e.catalog_item_id));
              
              updateState({
                acceptedEnhancements: [...(state.acceptedEnhancements || []), ...newEnhancements]
              });
            }}
            disabled={getAcceptedCount() === enhancements.length}
          >
            Accept All
          </Button>
        </Box>
      )}

      {/* Enhanced Metrics Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Metric Name</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Owner Function</TableCell>
              <TableCell>Data Source</TableCell>
              <TableCell>Collection Frequency</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {enhancements.length === 0 && !loadingEnhancements ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No AI enhancement suggestions available. You can retry or proceed to activate your catalog.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              enhancements.map((enhancement: any) => (
                <TableRow 
                  key={enhancement.catalog_item_id}
                  sx={{ 
                    opacity: isMetricEnhanced(enhancement.catalog_item_id) ? 0.6 : 1,
                    backgroundColor: isMetricEnhanced(enhancement.catalog_item_id) ? 'action.hover' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {enhancement.metric_name}
                      </Typography>
                      {isMetricEnhanced(enhancement.catalog_item_id) && (
                        <Chip size="small" label="Enhanced" color="success" sx={{ alignSelf: 'flex-start' }} />
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={priorityLabels[enhancement.suggested_priority as keyof typeof priorityLabels]}
                      size="small"
                      color={priorityColors[enhancement.suggested_priority as keyof typeof priorityColors] as any}
                      variant="outlined"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {enhancement.suggested_owner_function}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 150 }}>
                      {enhancement.suggested_data_source}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={enhancement.suggested_collection_frequency}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleAcceptEnhancement(enhancement)}
                        disabled={isMetricEnhanced(enhancement.catalog_item_id)}
                      >
                        <CheckIcon />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditEnhancement(enhancement)}
                        disabled={isMetricEnhanced(enhancement.catalog_item_id)}
                      >
                        <EditIcon />
                      </IconButton>
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
        {enhancements.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => {
              // Accept all unenhanced metrics
              const newEnhancements = enhancements
                .filter((e: any) => !isMetricEnhanced(e.catalog_item_id));
              
              updateState({
                acceptedEnhancements: [...(state.acceptedEnhancements || []), ...newEnhancements]
              });
            }}
            disabled={getAcceptedCount() === enhancements.length}
          >
            Accept All
          </Button>
        )}
        
        {(enhancements.length === 0 && !loadingEnhancements) && (
          <Button
            variant="outlined"
            onClick={handleGenerateEnhancements}
            disabled={!state.catalogId}
          >
            Retry Enhancement Generation
          </Button>
        )}
      </Box>

      {/* Edit Enhancement Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Metric Enhancement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Customize the enhancement suggestions for: <strong>{editingEnhancement?.metric_name}</strong>
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select
              value={editingEnhancement?.suggested_priority || 2}
              label="Priority"
              onChange={(e) => setEditingEnhancement((prev: any) => ({ ...prev, suggested_priority: e.target.value }))}
            >
              <MenuItem value={1}>High</MenuItem>
              <MenuItem value={2}>Medium</MenuItem>
              <MenuItem value={3}>Low</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Owner Function</InputLabel>
            <Select
              value={editingEnhancement?.suggested_owner_function || ''}
              label="Owner Function"
              onChange={(e) => setEditingEnhancement((prev: any) => ({ ...prev, suggested_owner_function: e.target.value }))}
            >
              {ownerFunctions.map((func) => (
                <MenuItem key={func} value={func}>{func}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Data Source"
            value={editingEnhancement?.suggested_data_source || ''}
            onChange={(e) => setEditingEnhancement((prev: any) => ({ ...prev, suggested_data_source: e.target.value }))}
            placeholder="Tool or system providing this metric data..."
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Collection Frequency</InputLabel>
            <Select
              value={editingEnhancement?.suggested_collection_frequency || 'monthly'}
              label="Collection Frequency"
              onChange={(e) => setEditingEnhancement((prev: any) => ({ ...prev, suggested_collection_frequency: e.target.value }))}
            >
              {collectionFrequencies.map((freq) => (
                <MenuItem key={freq} value={freq}>{freq}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEditedEnhancement} variant="contained">Save Enhancement</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MetricEnhancementStep;