import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  LinearProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';
import { ContentFrame } from './layout';
import { FrameworkSelector } from './FrameworkSelector';
import { useFramework } from '../contexts/FrameworkContext';
import {
  Metric,
  MetricFilters,
  CSFFunction,
  CSF_FUNCTION_NAMES,
  PRIORITY_NAMES,
  RISK_RATING_COLORS,
  RiskRating,
  MetricDirection,
  CollectionFrequency,
} from '../types';

// Constants for dropdown options
const DIRECTION_LABELS: Record<MetricDirection, string> = {
  [MetricDirection.HIGHER_IS_BETTER]: 'Higher is Better',
  [MetricDirection.LOWER_IS_BETTER]: 'Lower is Better',
  [MetricDirection.TARGET_RANGE]: 'Target Range',
  [MetricDirection.BINARY]: 'Binary',
};

const FREQUENCY_LABELS: Record<CollectionFrequency, string> = {
  [CollectionFrequency.DAILY]: 'Daily',
  [CollectionFrequency.WEEKLY]: 'Weekly',
  [CollectionFrequency.MONTHLY]: 'Monthly',
  [CollectionFrequency.QUARTERLY]: 'Quarterly',
  [CollectionFrequency.AD_HOC]: 'Ad Hoc',
};

interface EditingState {
  [metricId: string]: {
    [field: string]: any;
  };
}

interface MetricsGridState {
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  total: number;
  pageSize: number;
  page: number;
  filters: MetricFilters;
  selectedMetric: Metric | null;
  editDialogOpen: boolean;
  deleteDialogOpen: boolean;
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: 'success' | 'error' | 'warning' | 'info';
  activeCatalog: any | null;
  catalogLoading: boolean;
  editingValues: EditingState;
  savingMetric: string | null;
  // AI generation state
  aiGenerating: boolean;
  aiGenerated: boolean;
  aiError: string | null;
}

export default function MetricsGrid() {
  // Get the selected framework from context
  const { selectedFramework, isLoadingFrameworks } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  const [state, setState] = useState<MetricsGridState>({
    metrics: [],
    loading: true,
    error: null,
    total: 0,
    pageSize: 100,
    page: 0,
    filters: {
      limit: 100,
      offset: 0,
    },
    selectedMetric: null,
    editDialogOpen: false,
    deleteDialogOpen: false,
    snackbarOpen: false,
    snackbarMessage: '',
    snackbarSeverity: 'info',
    activeCatalog: null,
    catalogLoading: true,
    editingValues: {},
    savingMetric: null,
    aiGenerating: false,
    aiGenerated: false,
    aiError: null,
  });

  const showSnackbar = (message: string, severity: typeof state.snackbarSeverity = 'info') => {
    setState(prev => ({
      ...prev,
      snackbarMessage: message,
      snackbarSeverity: severity,
      snackbarOpen: true,
    }));
  };

  const loadActiveCatalog = useCallback(async () => {
    setState(prev => ({ ...prev, catalogLoading: true }));
    
    try {
      // First, try to get only active catalogs
      const activeCatalogs = await apiClient.getCatalogs('admin', true);
      
      // Look for a non-default active catalog first
      let activeCatalog = activeCatalogs.find(c => c.active && !c.is_default);
      
      // If no custom active catalog found, check if default catalog is being used
      if (!activeCatalog && activeCatalogs.length === 0) {
        // No active catalogs found, fall back to checking all catalogs
        const allCatalogs = await apiClient.getCatalogs('admin', false);
        activeCatalog = allCatalogs.find(c => c.active);
      }
      
      // Log for debugging
      console.log('Active catalog detection:', {
        activeCatalogs,
        selectedCatalog: activeCatalog,
        usingCustomCatalog: activeCatalog && !activeCatalog.is_default
      });
      
      setState(prev => ({
        ...prev,
        activeCatalog,
        catalogLoading: false,
      }));
      
      return activeCatalog;
    } catch (error) {
      console.error('Failed to load active catalog:', error);
      setState(prev => ({
        ...prev,
        activeCatalog: null,
        catalogLoading: false,
      }));
      return null;
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // If pageSize is -1 (All), use a high limit to get all metrics
      const isShowAll = state.pageSize === -1;
      const limit = isShowAll ? 1000 : state.pageSize;
      const offset = isShowAll ? 0 : state.page * state.pageSize;

      // Build filters with framework
      const filtersWithFramework = {
        ...state.filters,
        framework: frameworkCode,
        limit,
        offset,
      };

      // Choose data source based on active catalog
      const response = state.activeCatalog
        ? await apiClient.getActiveCatalogMetrics(filtersWithFramework, 'admin')
        : await apiClient.getMetrics(filtersWithFramework);
      
      setState(prev => ({
        ...prev,
        metrics: response.items,
        total: response.total,
        loading: false,
      }));
    } catch (error: any) {
      console.error('Failed to load metrics:', error);
      
      let errorMessage = 'Failed to load metrics. Please try again.';
      
      // Provide more specific error messages based on error type
      if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail;
        
        if (status === 404) {
          errorMessage = state.activeCatalog 
            ? 'No active catalog found. Please check your catalog settings.'
            : 'Metrics endpoint not found. Please check the API configuration.';
        } else if (status === 500) {
          errorMessage = detail 
            ? `Server error: ${detail}`
            : 'Internal server error occurred while loading metrics.';
        } else if (status >= 400 && status < 500) {
          errorMessage = detail || `Request error (${status}). Please check your filters and try again.`;
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to the server. Please check if the backend is running.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [state.filters, state.pageSize, state.page, state.activeCatalog, frameworkCode]);

  useEffect(() => {
    const loadData = async () => {
      await loadActiveCatalog();
    };
    loadData();
  }, [loadActiveCatalog]);

  useEffect(() => {
    if (!state.catalogLoading && !isLoadingFrameworks) {
      loadMetrics();
    }
  }, [loadMetrics, state.catalogLoading, state.activeCatalog, isLoadingFrameworks, frameworkCode]);

  const handleFilterChange = (field: keyof MetricFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [field]: value },
      page: 0,
      loading: true, // Show loading state when filters change
      error: null, // Clear any previous errors
    }));
  };

  const handleEditMetric = (metric: Metric) => {
    setState(prev => ({
      ...prev,
      selectedMetric: { ...metric },
      editDialogOpen: true,
    }));
  };

  const handleDeleteMetric = (metric: Metric) => {
    setState(prev => ({
      ...prev,
      selectedMetric: metric,
      deleteDialogOpen: true,
    }));
  };

  const handleSaveMetric = async () => {
    if (!state.selectedMetric) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      if (state.selectedMetric.id) {
        await apiClient.updateMetric(state.selectedMetric.id, state.selectedMetric);
        showSnackbar('Metric updated successfully', 'success');
      } else {
        await apiClient.createMetric(state.selectedMetric);
        showSnackbar('Metric created successfully', 'success');
      }
      
      await loadMetrics();
      setState(prev => ({ ...prev, editDialogOpen: false, selectedMetric: null }));
    } catch (error) {
      console.error('Failed to save metric:', error);
      showSnackbar('Failed to save metric', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleConfirmDelete = async () => {
    if (!state.selectedMetric?.id) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      await apiClient.deleteMetric(state.selectedMetric.id);
      showSnackbar('Metric deleted successfully', 'success');
      await loadMetrics();
      setState(prev => ({ ...prev, deleteDialogOpen: false, selectedMetric: null }));
    } catch (error) {
      console.error('Failed to delete metric:', error);
      showSnackbar('Failed to delete metric', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Lock/Unlock handlers
  const handleToggleLock = async (metric: Metric) => {
    try {
      setState(prev => ({ ...prev, savingMetric: metric.id }));

      // Check actual current lock state from the metric
      const currentlyLocked = metric.locked;

      if (currentlyLocked) {
        // Unlocking - start editing mode
        await apiClient.unlockMetric(metric.id);
        // Initialize editing values with current metric values
        setState(prev => ({
          ...prev,
          editingValues: {
            ...prev.editingValues,
            [metric.id]: {
              priority_rank: metric.priority_rank,
              current_value: metric.current_value,
              target_value: metric.target_value,
              direction: metric.direction,
              collection_frequency: metric.collection_frequency,
              owner_function: metric.owner_function,
            },
          },
          metrics: prev.metrics.map(m =>
            m.id === metric.id ? { ...m, locked: false } : m
          ),
          savingMetric: null,
        }));
        showSnackbar(`Metric unlocked for editing`, 'info');
      } else {
        // Locking - save changes first if any
        const editValues = state.editingValues[metric.id];
        if (editValues && Object.keys(editValues).length > 0) {
          // Only patch fields that are editable
          const patchData: any = {};
          if (editValues.priority_rank !== undefined) patchData.priority_rank = editValues.priority_rank;
          if (editValues.current_value !== undefined) patchData.current_value = editValues.current_value;
          if (editValues.target_value !== undefined) patchData.target_value = editValues.target_value;
          if (editValues.direction !== undefined) patchData.direction = editValues.direction;
          if (editValues.collection_frequency !== undefined) patchData.collection_frequency = editValues.collection_frequency;
          if (editValues.owner_function !== undefined) patchData.owner_function = editValues.owner_function;

          if (Object.keys(patchData).length > 0) {
            await apiClient.patchMetric(metric.id, patchData);
          }
        }
        await apiClient.lockMetric(metric.id);
        setState(prev => ({
          ...prev,
          editingValues: Object.fromEntries(
            Object.entries(prev.editingValues).filter(([key]) => key !== metric.id)
          ),
          metrics: prev.metrics.map(m =>
            m.id === metric.id ? { ...m, locked: true } : m
          ),
          savingMetric: null,
        }));
        showSnackbar('Changes saved and metric locked', 'success');
      }
    } catch (error) {
      console.error('Failed to toggle lock:', error);
      showSnackbar('Failed to toggle lock', 'error');
      setState(prev => ({ ...prev, savingMetric: null }));
    }
  };

  // Lock All / Unlock All handlers
  const handleLockAll = async () => {
    const unlockedMetrics = state.metrics.filter(m => !m.locked);
    if (unlockedMetrics.length === 0) {
      showSnackbar('All metrics are already locked', 'info');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      let successCount = 0;
      let failCount = 0;

      for (const metric of unlockedMetrics) {
        try {
          // Save any pending edits first
          const editValues = state.editingValues[metric.id];
          if (editValues && Object.keys(editValues).length > 0) {
            const patchData: any = {};
            if (editValues.priority_rank !== undefined) patchData.priority_rank = editValues.priority_rank;
            if (editValues.current_value !== undefined) patchData.current_value = editValues.current_value;
            if (editValues.target_value !== undefined) patchData.target_value = editValues.target_value;
            if (editValues.direction !== undefined) patchData.direction = editValues.direction;
            if (editValues.collection_frequency !== undefined) patchData.collection_frequency = editValues.collection_frequency;
            if (editValues.owner_function !== undefined) patchData.owner_function = editValues.owner_function;

            if (Object.keys(patchData).length > 0) {
              await apiClient.patchMetric(metric.id, patchData);
            }
          }
          await apiClient.lockMetric(metric.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to lock metric ${metric.id}:`, error);
          failCount++;
        }
      }

      // Update local state - clear editing values and mark as locked
      setState(prev => ({
        ...prev,
        editingValues: {},
        metrics: prev.metrics.map(m =>
          unlockedMetrics.find(um => um.id === m.id) ? { ...m, locked: true } : m
        ),
        loading: false,
      }));

      if (failCount === 0) {
        showSnackbar(`Locked ${successCount} metrics`, 'success');
      } else {
        showSnackbar(`Locked ${successCount} metrics, ${failCount} failed`, 'warning');
      }
    } catch (error) {
      console.error('Failed to lock all metrics:', error);
      showSnackbar('Failed to lock metrics', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleUnlockAll = async () => {
    const lockedMetrics = state.metrics.filter(m => m.locked);
    if (lockedMetrics.length === 0) {
      showSnackbar('All metrics are already unlocked', 'info');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      let successCount = 0;
      let failCount = 0;
      const newEditingValues: EditingState = { ...state.editingValues };

      for (const metric of lockedMetrics) {
        try {
          await apiClient.unlockMetric(metric.id);
          // Set up editing values for each unlocked metric
          newEditingValues[metric.id] = {
            priority_rank: metric.priority_rank,
            current_value: metric.current_value,
            target_value: metric.target_value,
            direction: metric.direction,
            collection_frequency: metric.collection_frequency,
            owner_function: metric.owner_function,
          };
          successCount++;
        } catch (error) {
          console.error(`Failed to unlock metric ${metric.id}:`, error);
          failCount++;
        }
      }

      // Update local state with editing values
      setState(prev => ({
        ...prev,
        editingValues: newEditingValues,
        metrics: prev.metrics.map(m =>
          lockedMetrics.find(lm => lm.id === m.id) ? { ...m, locked: false } : m
        ),
        loading: false,
      }));

      if (failCount === 0) {
        showSnackbar(`Unlocked ${successCount} metrics for editing`, 'success');
      } else {
        showSnackbar(`Unlocked ${successCount} metrics, ${failCount} failed`, 'warning');
      }
    } catch (error) {
      console.error('Failed to unlock all metrics:', error);
      showSnackbar('Failed to unlock metrics', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCancelEdit = async (metric: Metric) => {
    try {
      await apiClient.lockMetric(metric.id);
      setState(prev => ({
        ...prev,
        editingValues: Object.fromEntries(
          Object.entries(prev.editingValues).filter(([key]) => key !== metric.id)
        ),
        metrics: prev.metrics.map(m =>
          m.id === metric.id ? { ...m, locked: true } : m
        ),
      }));
      showSnackbar('Edit cancelled', 'info');
    } catch (error) {
      console.error('Failed to cancel edit:', error);
      showSnackbar('Failed to cancel edit', 'error');
    }
  };

  const handleFieldChange = (metricId: string, field: string, value: any) => {
    setState(prev => ({
      ...prev,
      editingValues: {
        ...prev.editingValues,
        [metricId]: {
          ...prev.editingValues[metricId],
          [field]: value,
        },
      },
    }));
  };

  const isEditing = (metricId: string) => {
    return !!state.editingValues[metricId];
  };

  const getEditValue = (metric: Metric, field: keyof Metric) => {
    if (state.editingValues[metric.id] && state.editingValues[metric.id][field] !== undefined) {
      return state.editingValues[metric.id][field];
    }
    return metric[field];
  };

  // AI-powered metric generation
  const handleGenerateMetric = async () => {
    if (!state.selectedMetric?.name || state.selectedMetric.name.trim().length < 3) {
      showSnackbar('Please enter a metric name (at least 3 characters)', 'warning');
      return;
    }

    setState(prev => ({ ...prev, aiGenerating: true, aiError: null }));

    try {
      const result = await apiClient.generateMetricFromName(
        state.selectedMetric.name.trim(),
        frameworkCode
      );

      if (result.success && result.metric) {
        // Update the selected metric with AI-generated values
        setState(prev => ({
          ...prev,
          selectedMetric: {
            ...prev.selectedMetric,
            ...result.metric,
            name: prev.selectedMetric?.name || result.metric.name, // Keep user's original name
          } as Metric,
          aiGenerating: false,
          aiGenerated: true,
          aiError: null,
        }));
        showSnackbar('Metric details generated! Please review and save.', 'success');
      } else {
        setState(prev => ({
          ...prev,
          aiGenerating: false,
          aiError: result.error || 'Failed to generate metric details',
        }));
        showSnackbar(result.error || 'Failed to generate metric details', 'error');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate metric';
      setState(prev => ({
        ...prev,
        aiGenerating: false,
        aiError: errorMessage,
      }));
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleOpenAddDialog = () => {
    setState(prev => ({
      ...prev,
      selectedMetric: { name: '' } as Metric,
      editDialogOpen: true,
      aiGenerated: false,
      aiError: null,
    }));
  };

  const handleExport = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      showSnackbar('Preparing export...', 'info');
      
      // Use appropriate export endpoint based on active catalog
      const blob = state.activeCatalog 
        ? await apiClient.exportActiveCatalogMetricsCSV(state.filters, 'admin')
        : await apiClient.exportMetricsCSV(state.filters);
      
      // Extract filename from Content-Disposition header or generate one
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = state.activeCatalog
        ? `active_catalog_metrics_export_${timestamp}.csv`
        : `metrics_export_${timestamp}.csv`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showSnackbar(`Export completed: ${filename}`, 'success');
    } catch (error: any) {
      console.error('Failed to export metrics:', error);
      
      let errorMessage = 'Failed to export metrics. Please try again.';
      
      // Provide more specific error messages for export failures
      if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail;
        
        if (status === 404) {
          errorMessage = state.activeCatalog 
            ? 'No active catalog found for export.'
            : 'Export endpoint not found.';
        } else if (status === 500) {
          errorMessage = detail 
            ? `Export failed: ${detail}`
            : 'Server error during export.';
        } else if (status >= 400) {
          errorMessage = detail || `Export request failed (${status}).`;
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server for export.';
      } else if (error.message) {
        errorMessage = `Export error: ${error.message}`;
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const getRiskColor = (score?: number): string => {
    if (score === undefined) return '#9e9e9e';
    if (score >= 85) return RISK_RATING_COLORS[RiskRating.LOW];
    if (score >= 65) return RISK_RATING_COLORS[RiskRating.MEDIUM];
    if (score >= 40) return '#ff9800'; // Orange for elevated risk
    return RISK_RATING_COLORS[RiskRating.HIGH];
  };

  // Format units for display - convert "percent" to "%" and add proper spacing
  const formatValueWithUnits = (value: number | null | undefined, units: string | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';

    if (!units) return String(value);

    // Convert "percent" to "%"
    if (units.toLowerCase() === 'percent' || units === '%') {
      return `${value}%`;
    }

    // For other units, add a space
    return `${value} ${units}`;
  };

  // Get formatted metric display name from description with unit prefix
  const getMetricDisplayName = (metric: Metric): string => {
    const description = metric.description || metric.name || '';
    const units = metric.target_units?.toLowerCase() || '';

    // Check for time-based metrics - use the name with unit suffix
    const timePatterns = ['MTTR', 'MTTD', 'Mean Time', 'Time to', 'Duration', 'RTO', 'RPO'];
    const hasTimeInName = timePatterns.some(p => (metric.name || '').includes(p));
    if (hasTimeInName || units === 'hours' || units === 'days' || units === 'minutes') {
      // For time metrics, show name with unit in parentheses
      const unitLabel = units === 'hours' ? 'hrs' : units === 'days' ? 'days' : units === 'minutes' ? 'min' : units;
      return unitLabel ? `${metric.name} (${unitLabel})` : metric.name || '';
    }

    // Format description with unit prefix
    let displayName = description;

    // Replace common patterns with symbols
    if (description.toLowerCase().startsWith('percentage of ')) {
      displayName = '% of ' + description.substring(14);
    } else if (description.toLowerCase().startsWith('percent of ')) {
      displayName = '% of ' + description.substring(11);
    } else if (description.toLowerCase().startsWith('the percentage of ')) {
      displayName = '% of ' + description.substring(18);
    } else if (description.toLowerCase().startsWith('number of ')) {
      displayName = '# of ' + description.substring(10);
    } else if (description.toLowerCase().startsWith('count of ')) {
      displayName = '# of ' + description.substring(9);
    } else if (description.toLowerCase().startsWith('total ')) {
      displayName = '# ' + description;
    } else if (units === 'percent' || units === '%') {
      // Add % prefix if description doesn't already have it
      if (!description.startsWith('%')) {
        displayName = '% ' + description;
      }
    } else if (units === 'count' || units === 'number') {
      // Add # prefix for count metrics
      if (!description.startsWith('#')) {
        displayName = '# ' + description;
      }
    }

    // Capitalize first letter after prefix if needed
    if (displayName.startsWith('% of ') || displayName.startsWith('# of ')) {
      const prefix = displayName.substring(0, 5);
      const rest = displayName.substring(5);
      displayName = prefix + rest.charAt(0).toUpperCase() + rest.slice(1);
    }

    return displayName || metric.name || '';
  };

  const columns: GridColDef[] = [
    {
      field: 'locked',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const saving = state.savingMetric === metric.id;
        const isUnlocked = !metric.locked;

        return (
          <Tooltip title={metric.locked ? `Click to unlock (locked by ${metric.locked_by || 'system'})` : 'Click to save and lock'}>
            <IconButton
              size="small"
              onClick={() => handleToggleLock(metric)}
              disabled={saving}
              sx={{ padding: '4px' }}
            >
              {saving ? (
                <CircularProgress size={16} />
              ) : isUnlocked ? (
                <LockOpenIcon fontSize="small" sx={{ color: '#4caf50' }} />
              ) : (
                <LockIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
              )}
            </IconButton>
          </Tooltip>
        );
      },
    },
    {
      field: 'metric_number',
      headerName: 'ID',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value || 'N/A'}
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: '0.8rem',
            backgroundColor: '#f5f5f5',
            color: '#555',
            border: '1px solid #e0e0e0'
          }}
        />
      ),
    },
    {
      field: 'name',
      headerName: 'Metric Name',
      width: 380,
      minWidth: 300,
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const displayName = getMetricDisplayName(metric);

        // Determine prefix color
        let prefixColor = '#666';
        if (displayName.startsWith('%')) {
          prefixColor = '#1976d2'; // Blue for percentage
        } else if (displayName.startsWith('#')) {
          prefixColor = '#388e3c'; // Green for count
        }

        // Split prefix from rest of name for styling
        const hasPrefix = displayName.startsWith('% ') || displayName.startsWith('# ');
        const prefix = hasPrefix ? displayName.substring(0, 1) : '';
        const restOfName = hasPrefix ? displayName.substring(2) : displayName;

        // Build tooltip with useful additional info (not redundant)
        const tooltipParts: string[] = [];

        // Add original name if it's meaningfully different from display
        const displayLower = displayName.toLowerCase().replace(/[%#]/g, '').trim();
        const nameLower = (metric.name || '').toLowerCase();

        // Only show name if it's not essentially the same as what's displayed
        if (nameLower && !displayLower.includes(nameLower.substring(0, 15)) &&
            !nameLower.includes(displayLower.substring(0, 15))) {
          tooltipParts.push(`ID: ${metric.name}`);
        }

        // Add formula if available (most useful additional info)
        if (metric.formula) {
          tooltipParts.push(`Formula: ${metric.formula}`);
        }

        // Add data source if available
        if (metric.data_source) {
          tooltipParts.push(`Source: ${metric.data_source}`);
        }

        const tooltipContent = tooltipParts.length > 0 ? tooltipParts.join('\n') : '';

        const content = (
          <div style={{
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.3',
            padding: '4px 0',
          }}>
            {prefix && (
              <span style={{
                fontWeight: 700,
                color: prefixColor,
                marginRight: '4px'
              }}>
                {prefix}
              </span>
            )}
            <span>{restOfName}</span>
          </div>
        );

        // Only wrap in Tooltip if there's useful content to show
        if (tooltipContent) {
          return (
            <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipContent}</span>}>
              {content}
            </Tooltip>
          );
        }

        return content;
      },
    },
    {
      field: 'formula',
      headerName: 'Formula',
      width: 320,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        const formula = params.row.formula;

        if (!formula) {
          return (
            <span style={{ color: '#9e9e9e', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Not defined
            </span>
          );
        }

        return (
          <div style={{
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.3',
            padding: '4px 0',
            fontSize: '0.85rem',
            color: '#444',
          }}>
            {formula}
          </div>
        );
      },
    },
    {
      field: 'risk_definition',
      headerName: 'Risk Definition',
      width: 400,
      minWidth: 250,
      flex: 1,  // Allow this column to grow with available space
      renderCell: (params: GridRenderCellParams) => {
        const riskDef = params.row.risk_definition;

        if (!riskDef) {
          return (
            <span style={{ color: '#9e9e9e', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Not defined
            </span>
          );
        }

        return (
          <div style={{
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.3',
            padding: '4px 0',
            fontSize: '0.85rem',
            color: '#444',
          }}>
            {riskDef}
          </div>
        );
      },
    },
    {
      field: 'csf_function',
      headerName: 'CSF Function',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const editing = isEditing(metric.id);
        const value = getEditValue(metric, 'csf_function') as CSFFunction;

        if (editing) {
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={value || ''}
                onChange={(e) => handleFieldChange(metric.id, 'csf_function', e.target.value)}
                sx={{ minWidth: 100 }}
              >
                {Object.entries(CSF_FUNCTION_NAMES).map(([key, name]) => (
                  <MenuItem key={key} value={key}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        return (
          <Chip
            label={CSF_FUNCTION_NAMES[params.value as CSFFunction]}
            size="small"
            color="primary"
          />
        );
      },
    },
    {
      field: 'csf_category_name',
      headerName: 'CSF Category',
      width: 220,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams) => {
        const categoryName = params.row.csf_category_name;
        const categoryCode = params.row.csf_category_code;

        if (!categoryName && !categoryCode) return <span style={{ color: '#9e9e9e' }}>-</span>;

        const displayText = categoryName || categoryCode;

        return (
          <Chip
            label={displayText}
            size="small"
            sx={{
              backgroundColor: '#8a73ff',
              color: 'white',
              height: 'auto',
              '& .MuiChip-label': {
                whiteSpace: 'normal',
                padding: '6px 10px',
                lineHeight: '1.3',
              },
              '&:hover': {
                backgroundColor: '#7c4dff'
              }
            }}
          />
        );
      },
    },
    {
      field: 'csf_subcategory_code',
      headerName: 'CSF Subcategory',
      width: 280,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        const subcategoryCode = params.row.csf_subcategory_code;
        const subcategoryOutcome = params.row.csf_subcategory_outcome;

        if (!subcategoryCode) {
          return <span style={{ color: '#9e9e9e' }}>-</span>;
        }

        return (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '4px 0',
          }}>
            <Chip
              label={subcategoryCode}
              size="small"
              sx={{
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                fontWeight: 600,
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
            />
            {subcategoryOutcome && (
              <span style={{
                fontSize: '0.8rem',
                color: '#555',
                lineHeight: '1.3',
              }}>
                {subcategoryOutcome}
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'priority_rank',
      headerName: 'Priority',
      width: 110,
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const editing = isEditing(metric.id);
        const value = getEditValue(metric, 'priority_rank') as number;

        if (editing) {
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={value || ''}
                onChange={(e) => handleFieldChange(metric.id, 'priority_rank', Number(e.target.value))}
                sx={{ minWidth: 80 }}
              >
                <MenuItem value={1}>High</MenuItem>
                <MenuItem value={2}>Medium</MenuItem>
                <MenuItem value={3}>Low</MenuItem>
              </Select>
            </FormControl>
          );
        }

        return (
          <Chip
            label={PRIORITY_NAMES[params.value as number] || 'Unknown'}
            size="small"
            color={params.value === 1 ? 'error' : params.value === 2 ? 'warning' : 'default'}
          />
        );
      },
    },
    {
      field: 'current_value',
      headerName: 'Current Value',
      width: 130,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const editing = isEditing(metric.id);
        const value = getEditValue(metric, 'current_value');
        const unitDisplay = metric.target_units?.toLowerCase() === 'percent' ? '%' : metric.target_units;

        if (editing) {
          return (
            <TextField
              size="small"
              type="number"
              value={value ?? ''}
              onChange={(e) => handleFieldChange(metric.id, 'current_value', e.target.value ? Number(e.target.value) : null)}
              sx={{ width: 100 }}
              InputProps={{
                endAdornment: unitDisplay ? <span style={{ fontSize: '0.75rem', color: '#666' }}>{unitDisplay}</span> : undefined,
              }}
            />
          );
        }

        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {params.value !== null && params.value !== undefined
              ? formatValueWithUnits(params.value, params.row.target_units)
              : 'No data'}
          </span>
        );
      },
    },
    {
      field: 'target_value',
      headerName: 'Target',
      width: 110,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const editing = isEditing(metric.id);
        const value = getEditValue(metric, 'target_value');
        const unitDisplay = metric.target_units?.toLowerCase() === 'percent' ? '%' : metric.target_units;

        if (editing) {
          return (
            <TextField
              size="small"
              type="number"
              value={value ?? ''}
              onChange={(e) => handleFieldChange(metric.id, 'target_value', e.target.value ? Number(e.target.value) : null)}
              sx={{ width: 80 }}
              InputProps={{
                endAdornment: unitDisplay ? <span style={{ fontSize: '0.75rem', color: '#666' }}>{unitDisplay}</span> : undefined,
              }}
            />
          );
        }

        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {formatValueWithUnits(params.value, params.row.target_units)}
          </span>
        );
      },
    },
    {
      field: 'metric_score',
      headerName: 'Score',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={params.value || 0}
            sx={{
              width: 60,
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                backgroundColor: getRiskColor(params.value),
              },
            }}
          />
          <Typography variant="body2" sx={{ minWidth: 35 }}>
            {params.value ? `${Math.round(params.value)}%` : 'N/A'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'owner_function',
      headerName: 'Owner',
      width: 120,
    },
    {
      field: 'collection_frequency',
      headerName: 'Frequency',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value || 'N/A'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const editing = isEditing(metric.id);
        const saving = state.savingMetric === metric.id;

        return (
          <Box display="flex" gap={0.5}>
            {editing ? (
              <>
                <Tooltip title="Save changes and lock">
                  <IconButton
                    size="small"
                    onClick={() => handleToggleLock(metric)}
                    color="primary"
                    disabled={saving}
                  >
                    {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel editing">
                  <IconButton
                    size="small"
                    onClick={() => handleCancelEdit(metric)}
                    color="default"
                    disabled={saving}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title={metric.locked ? 'Unlock for editing' : 'Lock metric'}>
                <IconButton
                  size="small"
                  onClick={() => handleToggleLock(metric)}
                  color={metric.locked ? 'default' : 'primary'}
                  disabled={saving}
                >
                  {saving ? (
                    <CircularProgress size={16} />
                  ) : metric.locked ? (
                    <LockIcon fontSize="small" />
                  ) : (
                    <LockOpenIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit in dialog">
              <IconButton
                size="small"
                onClick={() => handleEditMetric(params.row)}
                disabled={editing}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete metric">
              <IconButton
                size="small"
                onClick={() => handleDeleteMetric(params.row)}
                color="error"
                disabled={editing}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <ContentFrame maxWidth={false}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Metrics Catalog
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {selectedFramework && (
              <Chip
                label={selectedFramework.name}
                color="info"
                size="small"
              />
            )}
            {state.activeCatalog && (
              <Chip
                label={`Active: ${state.activeCatalog.name}`}
                color="primary"
                size="small"
              />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FrameworkSelector size="small" />
          {state.catalogLoading && (
            <CircularProgress size={24} />
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Metrics
              </Typography>
              <Typography variant="h5">{state.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Metrics
              </Typography>
              <Typography variant="h5">
                {state.metrics.filter(m => m.active).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                High Priority
              </Typography>
              <Typography variant="h5">
                {state.metrics.filter(m => m.priority_rank === 1).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Need Attention
              </Typography>
              <Typography variant="h5" color="error">
                {state.metrics.filter(m => (m.metric_score || 0) < 65).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2.5}>
            <TextField
              fullWidth
              label="Search"
              size="small"
              value={state.filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search metrics..."
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>CSF Function</InputLabel>
              <Select
                value={state.filters.function || ''}
                label="CSF Function"
                onChange={(e) => handleFilterChange('function', e.target.value || undefined)}
              >
                <MenuItem value="">All Functions</MenuItem>
                {Object.entries(CSF_FUNCTION_NAMES).map(([key, name]) => (
                  <MenuItem key={key} value={key}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={state.filters.priority_rank || ''}
                label="Priority"
                onChange={(e) => handleFilterChange('priority_rank', e.target.value || undefined)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={1}>High</MenuItem>
                <MenuItem value={2}>Medium</MenuItem>
                <MenuItem value={3}>Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={state.filters.active === undefined ? '' : state.filters.active.toString()}
                label="Status"
                onChange={(e) => handleFilterChange('active', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4.5}>
            <Box display="flex" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Tooltip title="Add a new metric - AI will auto-fill details from the name">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AIIcon />}
                  onClick={handleOpenAddDialog}
                >
                  AI Add
                </Button>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LockIcon />}
                onClick={handleLockAll}
                disabled={state.loading || state.metrics.filter(m => !m.locked).length === 0}
              >
                Lock All
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LockOpenIcon />}
                onClick={handleUnlockAll}
                disabled={state.loading || state.metrics.filter(m => m.locked).length === 0}
              >
                Unlock All
              </Button>
              <Tooltip title="Refresh">
                <IconButton onClick={loadMetrics} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export CSV">
                <IconButton onClick={handleExport} size="small">
                  <ExportIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Data Grid */}
      <Paper sx={{ height: state.pageSize === -1 ? 'auto' : 700, width: '100%' }}>
        <DataGrid
          rows={state.metrics}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: state.pageSize === -1 ? state.total : state.pageSize,
              },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100, { value: -1, label: 'All' }]}
          rowCount={state.total}
          paginationMode={state.pageSize === -1 ? 'client' : 'server'}
          loading={state.loading}
          onPaginationModelChange={(model) => {
            const newPageSize = model.pageSize === -1 ? -1 : model.pageSize;
            setState(prev => ({
              ...prev,
              page: newPageSize === -1 ? 0 : model.page,
              pageSize: newPageSize
            }));
          }}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          autoHeight={state.pageSize === -1}
          hideFooterPagination={state.pageSize === -1}
          getRowHeight={() => 'auto'}
          sx={{
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'flex-start',
              py: 1,
            },
            '& .MuiDataGrid-row': {
              minHeight: '52px !important',
            },
          }}
        />
      </Paper>

      {/* Edit Dialog with AI Generation */}
      <Dialog
        open={state.editDialogOpen}
        onClose={() => setState(prev => ({ ...prev, editDialogOpen: false, aiGenerated: false, aiError: null }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {state.selectedMetric?.id ? (
            'Edit Metric'
          ) : (
            <>
              <AIIcon color="primary" />
              AI-Powered Metric Creation
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {state.selectedMetric && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Step 1: Name input with AI Generate button (for new metrics) */}
              {!state.selectedMetric.id && !state.aiGenerated && (
                <>
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Enter a metric name and click "Generate with AI" to automatically fill in all the details.
                    </Alert>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" gap={2} alignItems="flex-start">
                      <TextField
                        fullWidth
                        label="Metric Name"
                        placeholder="e.g., Patch Compliance Rate, Mean Time to Detect, Security Training Completion"
                        value={state.selectedMetric.name || ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          selectedMetric: { ...prev.selectedMetric!, name: e.target.value }
                        }))}
                        disabled={state.aiGenerating}
                        helperText="Enter a descriptive name for your metric"
                      />
                      <Button
                        variant="contained"
                        onClick={handleGenerateMetric}
                        disabled={state.aiGenerating || !state.selectedMetric.name || state.selectedMetric.name.trim().length < 3}
                        startIcon={state.aiGenerating ? <CircularProgress size={16} color="inherit" /> : <AIIcon />}
                        sx={{ minWidth: 180, height: 56 }}
                      >
                        {state.aiGenerating ? 'Generating...' : 'Generate with AI'}
                      </Button>
                    </Box>
                  </Grid>
                  {state.aiError && (
                    <Grid item xs={12}>
                      <Alert severity="error">{state.aiError}</Alert>
                    </Grid>
                  )}
                </>
              )}

              {/* Step 2: Full form (shown after AI generation or for editing existing metrics) */}
              {(state.selectedMetric.id || state.aiGenerated) && (
                <>
                  {state.aiGenerated && !state.selectedMetric.id && (
                    <Grid item xs={12}>
                      <Alert severity="success" sx={{ mb: 1 }}>
                        AI has generated the metric details below. Please review and adjust as needed before saving.
                      </Alert>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Metric Name"
                      value={state.selectedMetric.name || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        selectedMetric: { ...prev.selectedMetric!, name: e.target.value }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      value={state.selectedMetric.description || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        selectedMetric: { ...prev.selectedMetric!, description: e.target.value }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Formula"
                      placeholder="e.g., (Patched Systems / Total Systems) × 100"
                      value={state.selectedMetric.formula || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        selectedMetric: { ...prev.selectedMetric!, formula: e.target.value }
                      }))}
                      helperText="How this metric is calculated"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>CSF Function</InputLabel>
                      <Select
                        value={state.selectedMetric.csf_function || ''}
                        label="CSF Function"
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          selectedMetric: { ...prev.selectedMetric!, csf_function: e.target.value as CSFFunction }
                        }))}
                      >
                        {Object.entries(CSF_FUNCTION_NAMES).map(([key, name]) => (
                          <MenuItem key={key} value={key}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={state.selectedMetric.priority_rank || ''}
                        label="Priority"
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          selectedMetric: { ...prev.selectedMetric!, priority_rank: Number(e.target.value) }
                        }))}
                      >
                        <MenuItem value={1}>High</MenuItem>
                        <MenuItem value={2}>Medium</MenuItem>
                        <MenuItem value={3}>Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <FormControl fullWidth>
                      <InputLabel>Direction</InputLabel>
                      <Select
                        value={state.selectedMetric.direction || 'higher_is_better'}
                        label="Direction"
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          selectedMetric: { ...prev.selectedMetric!, direction: e.target.value as MetricDirection }
                        }))}
                      >
                        {Object.entries(DIRECTION_LABELS).map(([key, label]) => (
                          <MenuItem key={key} value={key}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Target Value"
                      value={state.selectedMetric.target_value ?? ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        selectedMetric: { ...prev.selectedMetric!, target_value: e.target.value ? Number(e.target.value) : undefined }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Target Units"
                      placeholder="percent, hours, days, count"
                      value={state.selectedMetric.target_units || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        selectedMetric: { ...prev.selectedMetric!, target_units: e.target.value }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Current Value"
                      value={state.selectedMetric.current_value ?? ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        selectedMetric: { ...prev.selectedMetric!, current_value: e.target.value ? Number(e.target.value) : undefined }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Owner Function"
                      placeholder="Security Operations, IT, etc."
                      value={state.selectedMetric.owner_function || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        selectedMetric: { ...prev.selectedMetric!, owner_function: e.target.value }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControl fullWidth>
                      <InputLabel>Collection Frequency</InputLabel>
                      <Select
                        value={state.selectedMetric.collection_frequency || ''}
                        label="Collection Frequency"
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          selectedMetric: { ...prev.selectedMetric!, collection_frequency: e.target.value as CollectionFrequency }
                        }))}
                      >
                        {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                          <MenuItem key={key} value={key}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, editDialogOpen: false, aiGenerated: false, aiError: null }))}>
            Cancel
          </Button>
          {(state.selectedMetric?.id || state.aiGenerated) && (
            <Button onClick={handleSaveMetric} variant="contained" color="primary">
              {state.selectedMetric?.id ? 'Save Changes' : 'Create Metric'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={state.deleteDialogOpen}
        onClose={() => setState(prev => ({ ...prev, deleteDialogOpen: false }))}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the metric "{state.selectedMetric?.name}"?
          This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, deleteDialogOpen: false }))}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={state.snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setState(prev => ({ ...prev, snackbarOpen: false }))}
      >
        <Alert
          severity={state.snackbarSeverity}
          onClose={() => setState(prev => ({ ...prev, snackbarOpen: false }))}
        >
          {state.snackbarMessage}
        </Alert>
      </Snackbar>
    </ContentFrame>
  );
}