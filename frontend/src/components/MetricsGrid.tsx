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
  MetricType,
  CSFFunction,
  AIRMFFunction,
  CSF_FUNCTION_NAMES,
  AI_RMF_FUNCTION_NAMES,
  AI_RMF_TRUSTWORTHINESS,
  PRIORITY_NAMES,
  RISK_RATING_COLORS,
  RiskRating,
  MetricDirection,
  CollectionFrequency,
  UpdateType,
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

// Helper to filter metrics by type (Cyber vs AI Profile)
const filterMetricsByType = (metrics: Metric[], metricType?: MetricType): Metric[] => {
  if (!metricType || metricType === 'all') {
    return metrics;
  }

  return metrics.filter(metric => {
    const metricNumber = metric.metric_number || '';
    const isAIProfile = metricNumber.includes('-AI-');

    if (metricType === 'ai_profile') {
      return isAIProfile;
    } else if (metricType === 'cyber') {
      return !isAIProfile;
    }
    return true;
  });
};

// Column header tooltip definitions for CSF 2.0
const CSF_COLUMN_TOOLTIPS: Record<string, string> = {
  locked: 'Lock/unlock metric for editing. Locked metrics are protected from accidental changes.',
  metric_number: 'Unique identifier code for the metric (e.g., GV-01, ID-02)',
  name: 'Descriptive name explaining what the metric measures',
  formula: 'Calculation method used to compute the metric value',
  risk_definition: 'Description of the risk or security outcome this metric helps measure',
  business_impact: 'Business consequences if this area is not monitored (financial, regulatory, reputational)',
  csf_function: 'NIST CSF 2.0 Function: Govern, Identify, Protect, Detect, Respond, or Recover',
  csf_category_name: 'NIST CSF 2.0 Category within the function (e.g., Risk Management, Asset Management)',
  csf_subcategory_code: 'NIST CSF 2.0 Subcategory identifier (e.g., GV.RM-01, ID.AM-02)',
  csf_subcategory_outcome: 'Expected outcome or control objective from the NIST CSF subcategory',
  priority_rank: 'Business priority: High (critical), Medium (important), Low (nice-to-have)',
  current_value: 'Most recent measured value for this metric',
  target_value: 'Goal or threshold value the organization aims to achieve',
  metric_score: 'Gap-to-target performance score (0-100%). Higher is better.',
  owner_function: 'Team or department responsible for this metric',
  data_source: 'Tool, system, or process that provides the metric data',
  collection_frequency: 'How often the metric data is collected (Daily, Weekly, Monthly, etc.)',
  active: 'Whether this metric is actively tracked and included in scoring',
  actions: 'Edit, delete, or manage metric settings',
};

// Column header tooltip definitions for AI RMF
const AI_RMF_COLUMN_TOOLTIPS: Record<string, string> = {
  locked: 'Lock/unlock metric for editing. Locked metrics are protected from accidental changes.',
  metric_number: 'Unique identifier code for the metric (e.g., AI-GOV-001, AI-MAP-002)',
  name: 'Descriptive name explaining what the metric measures',
  formula: 'Calculation method used to compute the metric value',
  risk_definition: 'Description of the AI risk or trustworthiness outcome this metric helps measure',
  business_impact: 'Business consequences if this AI area is not monitored (compliance, safety, trust)',
  ai_rmf_function: 'NIST AI RMF 1.0 Function: Govern, Map, Measure, or Manage',
  ai_rmf_category_name: 'NIST AI RMF 1.0 Category within the function (e.g., Policies & Processes, Context & Purpose)',
  ai_rmf_subcategory_code: 'NIST AI RMF 1.0 Subcategory identifier (e.g., GOVERN-1.1, MAP-2.3)',
  ai_rmf_subcategory_outcome: 'Expected outcome from the NIST AI RMF subcategory',
  trustworthiness: 'AI RMF Trustworthiness Characteristic (e.g., Valid & Reliable, Fair, Safe)',
  priority_rank: 'Business priority: High (critical), Medium (important), Low (nice-to-have)',
  current_value: 'Most recent measured value for this metric',
  target_value: 'Goal or threshold value the organization aims to achieve',
  metric_score: 'Gap-to-target performance score (0-100%). Higher is better.',
  owner_function: 'Team or department responsible for this metric',
  data_source: 'Tool, system, or process that provides the metric data',
  collection_frequency: 'How often the metric data is collected (Daily, Weekly, Monthly, etc.)',
  active: 'Whether this metric is actively tracked and included in scoring',
  actions: 'Edit, delete, or manage metric settings',
};

// Helper to render column header with tooltip (takes tooltip map as parameter)
const renderHeaderWithTooltipMap = (field: string, headerName: string, tooltips: Record<string, string>) => () => (
  <Tooltip title={tooltips[field] || ''} arrow placement="top">
    <Box component="span" sx={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
      {headerName}
    </Box>
  </Tooltip>
);

/**
 * Validate that a metric value is within reasonable bounds relative to target.
 * Returns { valid: true } or { valid: false, error: string }
 */
const validateMetricValue = (
  currentValue: number | undefined,
  targetValue: number | undefined,
  targetUnits?: string
): { valid: boolean; error?: string } => {
  if (currentValue === undefined || currentValue === null) {
    return { valid: true };
  }

  // Rule 1: current_value must be non-negative
  if (currentValue < 0) {
    return { valid: false, error: 'Value cannot be negative' };
  }

  // If no target, allow any non-negative value
  if (targetValue === undefined || targetValue === null || targetValue === 0) {
    return { valid: true };
  }

  // Rule 2: For percentage metrics (target ~= 100 or units = "%"), cap at 150
  const isPercentage = targetUnits === '%' || (targetValue >= 95 && targetValue <= 105);
  if (isPercentage && currentValue > 150) {
    return {
      valid: false,
      error: `Value ${currentValue} exceeds maximum of 150 for percentage metrics`,
    };
  }

  // Rule 3: For all metrics, current_value shouldn't exceed 10x target
  const maxMultiplier = 10.0;
  const maxAllowed = targetValue * maxMultiplier;
  if (currentValue > maxAllowed) {
    return {
      valid: false,
      error: `Value ${currentValue} exceeds maximum (${maxAllowed.toFixed(1)} = ${maxMultiplier}x target of ${targetValue})`,
    };
  }

  return { valid: true };
};

interface EditingState {
  [metricId: string]: {
    [field: string]: any;
  };
}

interface SummaryStats {
  totalMetrics: number;
  activeMetrics: number;
  highPriority: number;
  needAttention: number;
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
  // Summary stats (independent of filters)
  summaryStats: SummaryStats;
  // Update type dialog state
  updateTypeDialogOpen: boolean;
  pendingUpdateMetric: Metric | null;
  pendingUpdateData: Record<string, any> | null;
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
    summaryStats: {
      totalMetrics: 0,
      activeMetrics: 0,
      highPriority: 0,
      needAttention: 0,
    },
    updateTypeDialogOpen: false,
    pendingUpdateMetric: null,
    pendingUpdateData: null,
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
      const currentUserEmail = localStorage.getItem('userEmail') || 'admin@example.com';
      // First, try to get only active catalogs
      const activeCatalogs = await apiClient.getCatalogs(currentUserEmail, true);

      // Look for a non-default active catalog first
      let activeCatalog = activeCatalogs.find(c => c.active && !c.is_default);

      // If no custom active catalog found, check if default catalog is being used
      if (!activeCatalog && activeCatalogs.length === 0) {
        // No active catalogs found, fall back to checking all catalogs
        const allCatalogs = await apiClient.getCatalogs(currentUserEmail, false);
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

  // Load summary stats independently of filters/pagination
  const loadSummaryStats = useCallback(async () => {
    try {
      // Fetch all metrics without pagination to get accurate totals
      const allMetricsFilters = {
        framework: frameworkCode,
        limit: 1000,  // High limit to get all metrics
        offset: 0,
      };

      const currentUserEmail = localStorage.getItem('userEmail') || 'admin@example.com';
      const response = state.activeCatalog
        ? await apiClient.getActiveCatalogMetrics(allMetricsFilters, currentUserEmail)
        : await apiClient.getMetrics(allMetricsFilters);

      // Apply metric type filter to summary stats as well
      const allMetrics = filterMetricsByType(response.items, state.filters.metric_type);

      setState(prev => ({
        ...prev,
        summaryStats: {
          totalMetrics: allMetrics.length,
          activeMetrics: allMetrics.filter(m => m.active).length,
          highPriority: allMetrics.filter(m => m.priority_rank === 1).length,
          needAttention: allMetrics.filter(m => (m.metric_score || 0) < 65).length,
        },
      }));
    } catch (error) {
      console.error('Failed to load summary stats:', error);
      // Don't show error to user - summary stats are secondary
    }
  }, [frameworkCode, state.activeCatalog, state.filters.metric_type]);

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
      const currentUserEmail = localStorage.getItem('userEmail') || 'admin@example.com';
      const response = state.activeCatalog
        ? await apiClient.getActiveCatalogMetrics(filtersWithFramework, currentUserEmail)
        : await apiClient.getMetrics(filtersWithFramework);

      // Apply client-side metric type filter (Cyber vs AI Profile)
      const filteredMetrics = filterMetricsByType(response.items, state.filters.metric_type);

      // Initialize editingValues for any metrics that are already unlocked
      const newEditingValues: EditingState = { ...state.editingValues };
      filteredMetrics.forEach(metric => {
        if (!metric.locked && !newEditingValues[metric.id]) {
          newEditingValues[metric.id] = {
            priority_rank: metric.priority_rank,
            current_value: metric.current_value,
            target_value: metric.target_value,
            direction: metric.direction,
            collection_frequency: metric.collection_frequency,
            owner_function: metric.owner_function,
          };
        }
      });

      setState(prev => ({
        ...prev,
        metrics: filteredMetrics,
        editingValues: newEditingValues,
        total: state.filters.metric_type ? filteredMetrics.length : response.total,
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

  // Load summary stats when catalog or framework changes (independent of filters)
  useEffect(() => {
    if (!state.catalogLoading && !isLoadingFrameworks) {
      loadSummaryStats();
    }
  }, [loadSummaryStats, state.catalogLoading, isLoadingFrameworks]);

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
        // Updating existing metric
        await apiClient.updateMetric(state.selectedMetric.id, state.selectedMetric);
        showSnackbar('Metric updated successfully', 'success');
      } else {
        // Creating new metric
        await apiClient.createMetric(state.selectedMetric);
        showSnackbar('Metric created successfully', 'success');
      }

      await loadMetrics();
      await loadSummaryStats(); // Refresh summary stats after changes
      setState(prev => ({ ...prev, editDialogOpen: false, selectedMetric: null }));
    } catch (error: any) {
      console.error('Failed to save metric:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to save metric';
      showSnackbar(errorMsg, 'error');
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
      await loadSummaryStats(); // Refresh summary stats after deletion
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

          // Validate current_value before saving
          if (editValues.current_value !== undefined) {
            const targetVal = editValues.target_value !== undefined ? editValues.target_value : metric.target_value;
            const validation = validateMetricValue(editValues.current_value, targetVal, metric.target_units);
            if (!validation.valid) {
              showSnackbar(validation.error || 'Invalid value', 'error');
              setState(prev => ({ ...prev, savingMetric: null }));
              return; // Don't save - let user correct the value
            }
          }

          // Check if current_value has changed - show dialog to ask update type
          const currentValueChanged = (
            editValues.current_value !== undefined &&
            editValues.current_value !== metric.current_value
          );

          if (currentValueChanged && Object.keys(patchData).length > 0) {
            // Show dialog to ask user for update type
            setState(prev => ({
              ...prev,
              updateTypeDialogOpen: true,
              pendingUpdateMetric: metric,
              pendingUpdateData: patchData,
              savingMetric: null,
            }));
            return; // Exit early - will continue in handleUpdateTypeConfirm
          }

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
    } catch (error: any) {
      console.error('Failed to toggle lock:', error);
      // Extract validation error message from backend response
      const errorMessage = error?.response?.data?.detail || 'Failed to toggle lock';
      showSnackbar(errorMessage, 'error');
      setState(prev => ({ ...prev, savingMetric: null }));
    }
  };

  // Handle update type confirmation from dialog
  const handleUpdateTypeConfirm = async (updateType: UpdateType) => {
    const metric = state.pendingUpdateMetric;
    const patchData = state.pendingUpdateData;

    if (!metric || !patchData) {
      setState(prev => ({
        ...prev,
        updateTypeDialogOpen: false,
        pendingUpdateMetric: null,
        pendingUpdateData: null,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, savingMetric: metric.id }));

      // Add update_type to the patch data
      const patchWithType = { ...patchData, update_type: updateType };
      await apiClient.patchMetric(metric.id, patchWithType);
      await apiClient.lockMetric(metric.id);

      // Reload metrics to get updated values
      await loadMetrics();

      setState(prev => ({
        ...prev,
        editingValues: Object.fromEntries(
          Object.entries(prev.editingValues).filter(([key]) => key !== metric.id)
        ),
        metrics: prev.metrics.map(m =>
          m.id === metric.id ? { ...m, locked: true } : m
        ),
        savingMetric: null,
        updateTypeDialogOpen: false,
        pendingUpdateMetric: null,
        pendingUpdateData: null,
      }));

      const typeLabel = updateType === UpdateType.PERIOD_UPDATE ? 'Period update' : 'Adjustment';
      showSnackbar(`${typeLabel} saved and metric locked`, 'success');
    } catch (error: any) {
      console.error('Failed to save with update type:', error);
      // Extract validation error message from backend response
      const errorMessage = error?.response?.data?.detail || 'Failed to save changes';
      showSnackbar(errorMessage, 'error');
      setState(prev => ({
        ...prev,
        savingMetric: null,
        updateTypeDialogOpen: false,
        pendingUpdateMetric: null,
        pendingUpdateData: null,
      }));
    }
  };

  // Handle update type dialog cancel
  const handleUpdateTypeCancel = () => {
    setState(prev => ({
      ...prev,
      updateTypeDialogOpen: false,
      pendingUpdateMetric: null,
      pendingUpdateData: null,
      savingMetric: null,
    }));
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
          // Save any pending edits first - only if values actually changed from original
          const editValues = state.editingValues[metric.id];
          if (editValues && Object.keys(editValues).length > 0) {
            const patchData: any = {};
            // Only include fields that actually changed from original metric values
            if (editValues.priority_rank !== undefined && editValues.priority_rank !== metric.priority_rank) {
              patchData.priority_rank = editValues.priority_rank;
            }
            if (editValues.current_value !== undefined && editValues.current_value !== metric.current_value) {
              patchData.current_value = editValues.current_value;
            }
            if (editValues.target_value !== undefined && editValues.target_value !== metric.target_value) {
              patchData.target_value = editValues.target_value;
            }
            if (editValues.direction !== undefined && editValues.direction !== metric.direction) {
              patchData.direction = editValues.direction;
            }
            if (editValues.collection_frequency !== undefined && editValues.collection_frequency !== metric.collection_frequency) {
              patchData.collection_frequency = editValues.collection_frequency;
            }
            if (editValues.owner_function !== undefined && editValues.owner_function !== metric.owner_function) {
              patchData.owner_function = editValues.owner_function;
            }

            // Validate current_value before saving
            if (patchData.current_value !== undefined) {
              const targetVal = patchData.target_value !== undefined ? patchData.target_value : metric.target_value;
              const validation = validateMetricValue(patchData.current_value, targetVal, metric.target_units);
              if (!validation.valid) {
                console.error(`Validation failed for metric ${metric.name}: ${validation.error}`);
                failCount++;
                continue; // Skip this metric
              }
            }

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

      // Build filters with framework to ensure we only export metrics from the current framework
      const filtersWithFramework = {
        ...state.filters,
        framework: frameworkCode,
      };

      // Use appropriate export endpoint based on active catalog
      const currentUserEmail = localStorage.getItem('userEmail') || 'admin@example.com';
      const blob = state.activeCatalog
        ? await apiClient.exportActiveCatalogMetricsCSV(filtersWithFramework, currentUserEmail)
        : await apiClient.exportMetricsCSV(filtersWithFramework);
      
      // Extract filename from Content-Disposition header or generate one
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = state.activeCatalog
        ? `${frameworkCode}_active_catalog_metrics_${timestamp}.csv`
        : `${frameworkCode}_metrics_${timestamp}.csv`;
      
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

  // Format units for display - convert "percent" to "%" and abbreviate time units
  const formatValueWithUnits = (value: number | null | undefined, units: string | null | undefined, direction?: string): string => {
    if (value === null || value === undefined) return 'N/A';

    // Handle binary direction - show Yes/No instead of 1/0
    if (direction === 'binary' || direction === MetricDirection.BINARY) {
      return value >= 1 ? 'Yes' : 'No';
    }

    if (!units) return String(value);

    const unitsLower = units.toLowerCase();

    // Convert "percent" to "%"
    if (unitsLower === 'percent' || units === '%') {
      return `${value}%`;
    }

    // Remove "count" - just show the number
    if (unitsLower === 'count') {
      return String(value);
    }

    // Convert "per X" to "/X" format
    if (unitsLower.startsWith('per ')) {
      const timeUnit = unitsLower.substring(4); // Remove "per "
      if (timeUnit === 'year') return `${value}/yr`;
      if (timeUnit === 'month') return `${value}/mo`;
      if (timeUnit === 'quarter') return `${value}/qtr`;
      if (timeUnit === 'week') return `${value}/wk`;
      if (timeUnit === 'day') return `${value}/day`;
      return `${value}/${timeUnit}`;
    }

    // Abbreviate standalone time units
    if (unitsLower === 'years') return `${value} yrs`;
    if (unitsLower === 'year') return `${value} yr`;
    if (unitsLower === 'months') return `${value} mo`;
    if (unitsLower === 'month') return `${value} mo`;
    if (unitsLower === 'hours') return `${value} hrs`;
    if (unitsLower === 'hour') return `${value} hr`;
    if (unitsLower === 'minutes') return `${value} min`;
    if (unitsLower === 'minute') return `${value} min`;
    if (unitsLower === 'days') return `${value}d`;
    if (unitsLower === 'day') return `${value}d`;

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
    if (hasTimeInName || units === 'hours' || units === 'days' || units === 'minutes' || units === 'years' || units === 'year') {
      // For time metrics, show name with unit in parentheses (abbreviated)
      let unitLabel = units;
      if (units === 'hours') unitLabel = 'hrs';
      else if (units === 'hour') unitLabel = 'hr';
      else if (units === 'years') unitLabel = 'yrs';
      else if (units === 'year') unitLabel = 'yr';
      else if (units === 'minutes') unitLabel = 'min';
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
      cellClassName: 'sticky-lock-cell',
      headerClassName: 'sticky-lock-header',
      renderHeader: renderHeaderWithTooltipMap('locked', '🔒', CSF_COLUMN_TOOLTIPS),
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
      width: 150,
      minWidth: 130,
      renderHeader: renderHeaderWithTooltipMap('metric_number', 'ID', CSF_COLUMN_TOOLTIPS),
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
      renderHeader: renderHeaderWithTooltipMap('name', 'Metric Name', CSF_COLUMN_TOOLTIPS),
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
      renderHeader: renderHeaderWithTooltipMap('formula', 'Formula', CSF_COLUMN_TOOLTIPS),
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
      renderHeader: renderHeaderWithTooltipMap('risk_definition', 'Risk Definition', CSF_COLUMN_TOOLTIPS),
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
      field: 'business_impact',
      headerName: 'Business Impact',
      width: 450,
      minWidth: 350,
      flex: 1.5,
      renderHeader: renderHeaderWithTooltipMap('business_impact', 'Business Impact', CSF_COLUMN_TOOLTIPS),
      renderCell: (params: GridRenderCellParams) => {
        const impact = params.row.business_impact;

        if (!impact) {
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
            color: 'inherit',  // Use default text color
          }}>
            {impact}
          </div>
        );
      },
    },
    // Framework-specific columns: CSF 2.0 or AI RMF based on selected framework
    ...(frameworkCode === 'ai_rmf' ? [
      // AI RMF Function column
      {
        field: 'ai_rmf_function',
        headerName: 'AI RMF Function',
        width: 140,
        renderHeader: renderHeaderWithTooltipMap('ai_rmf_function', 'AI RMF Function', AI_RMF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const metric = params.row as Metric;
          const funcName = metric.ai_rmf_function_name || AI_RMF_FUNCTION_NAMES[params.value as AIRMFFunction];

          if (!funcName) {
            return <span style={{ color: '#9e9e9e' }}>-</span>;
          }

          return (
            <Typography variant="body2">
              {funcName}
            </Typography>
          );
        },
      },
      // AI RMF Category column
      {
        field: 'ai_rmf_category_name',
        headerName: 'AI RMF Category',
        width: 220,
        minWidth: 180,
        renderHeader: renderHeaderWithTooltipMap('ai_rmf_category_name', 'AI RMF Category', AI_RMF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const metric = params.row as Metric;
          const categoryName = metric.ai_rmf_category_name;
          const categoryCode = metric.ai_rmf_category_code;

          if (!categoryName && !categoryCode) return <span style={{ color: '#9e9e9e' }}>-</span>;

          return (
            <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
              {categoryName || categoryCode}
            </Typography>
          );
        },
      },
      // AI RMF Subcategory Code column
      {
        field: 'ai_rmf_subcategory_code',
        headerName: 'Subcategory ID',
        width: 140,
        minWidth: 120,
        renderHeader: renderHeaderWithTooltipMap('ai_rmf_subcategory_code', 'Subcategory ID', AI_RMF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const metric = params.row as Metric;
          const subcategoryCode = metric.ai_rmf_subcategory_code;

          if (!subcategoryCode) {
            return <span style={{ color: '#9e9e9e' }}>-</span>;
          }

          return (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {subcategoryCode}
            </Typography>
          );
        },
      },
      // AI RMF Subcategory Outcome column
      {
        field: 'ai_rmf_subcategory_outcome',
        headerName: 'Subcategory Definition',
        width: 280,
        minWidth: 200,
        flex: 0.5,
        renderHeader: renderHeaderWithTooltipMap('ai_rmf_subcategory_outcome', 'Subcategory Definition', AI_RMF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const metric = params.row as Metric;
          const subcategoryOutcome = metric.ai_rmf_subcategory_outcome;

          if (!subcategoryOutcome) {
            return <span style={{ color: '#9e9e9e' }}>-</span>;
          }

          return (
            <div style={{
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.3',
              padding: '4px 0',
              fontSize: '0.85rem',
              color: '#555',
            }}>
              {subcategoryOutcome}
            </div>
          );
        },
      },
      // AI RMF Trustworthiness Characteristic column
      {
        field: 'trustworthiness_characteristic',
        headerName: 'Trustworthiness',
        width: 180,
        minWidth: 150,
        renderHeader: renderHeaderWithTooltipMap('trustworthiness', 'Trustworthiness', AI_RMF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const metric = params.row as Metric;
          const trustworthiness = metric.trustworthiness_characteristic;

          if (!trustworthiness) {
            return <span style={{ color: '#9e9e9e' }}>-</span>;
          }

          const displayText = AI_RMF_TRUSTWORTHINESS[trustworthiness] || trustworthiness;

          return (
            <Chip
              label={displayText}
              size="small"
              sx={{
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                fontWeight: 500,
                height: 'auto',
                '& .MuiChip-label': {
                  whiteSpace: 'normal',
                  padding: '4px 8px',
                  lineHeight: '1.2',
                },
              }}
            />
          );
        },
      },
    ] : [
      // CSF 2.0 Function column
      {
        field: 'csf_function',
        headerName: 'CSF Function',
        width: 140,
        renderHeader: renderHeaderWithTooltipMap('csf_function', 'CSF Function', CSF_COLUMN_TOOLTIPS),
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
            <Typography variant="body2">
              {CSF_FUNCTION_NAMES[params.value as CSFFunction] || '-'}
            </Typography>
          );
        },
      },
      // CSF 2.0 Category column
      {
        field: 'csf_category_name',
        headerName: 'CSF Category',
        width: 220,
        minWidth: 180,
        renderHeader: renderHeaderWithTooltipMap('csf_category_name', 'CSF Category', CSF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const categoryName = params.row.csf_category_name;
          const categoryCode = params.row.csf_category_code;

          if (!categoryName && !categoryCode) return <span style={{ color: '#9e9e9e' }}>-</span>;

          return (
            <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
              {categoryName || categoryCode}
            </Typography>
          );
        },
      },
      // CSF 2.0 Subcategory Code column
      {
        field: 'csf_subcategory_code',
        headerName: 'Subcategory ID',
        width: 120,
        minWidth: 100,
        renderHeader: renderHeaderWithTooltipMap('csf_subcategory_code', 'Subcategory ID', CSF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const subcategoryCode = params.row.csf_subcategory_code;

          if (!subcategoryCode) {
            return <span style={{ color: '#9e9e9e' }}>-</span>;
          }

          return (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {subcategoryCode}
            </Typography>
          );
        },
      },
      // CSF 2.0 Subcategory Outcome column
      {
        field: 'csf_subcategory_outcome',
        headerName: 'Subcategory Definition',
        width: 280,
        minWidth: 200,
        flex: 0.5,
        renderHeader: renderHeaderWithTooltipMap('csf_subcategory_outcome', 'Subcategory Definition', CSF_COLUMN_TOOLTIPS),
        renderCell: (params: GridRenderCellParams) => {
          const subcategoryOutcome = params.row.csf_subcategory_outcome;

          if (!subcategoryOutcome) {
            return <span style={{ color: '#9e9e9e' }}>-</span>;
          }

          return (
            <div style={{
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.3',
              padding: '4px 0',
              fontSize: '0.85rem',
              color: '#555',
            }}>
              {subcategoryOutcome}
            </div>
          );
        },
      },
    ]),
    {
      field: 'priority_rank',
      headerName: 'Priority',
      width: 110,
      renderHeader: renderHeaderWithTooltipMap('priority_rank', 'Priority', CSF_COLUMN_TOOLTIPS),
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
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'current_value',
      headerName: 'Current Value',
      width: 130,
      type: 'number',
      renderHeader: renderHeaderWithTooltipMap('current_value', 'Current Value', CSF_COLUMN_TOOLTIPS),
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const editing = isEditing(metric.id);
        const value = getEditValue(metric, 'current_value');
        // Abbreviate units for display
        let unitDisplay = metric.target_units;
        const unitsLower = metric.target_units?.toLowerCase();
        if (unitsLower === 'percent') unitDisplay = '%';
        else if (unitsLower === 'hours') unitDisplay = 'hrs';
        else if (unitsLower === 'hour') unitDisplay = 'hr';
        else if (unitsLower === 'years') unitDisplay = 'yrs';
        else if (unitsLower === 'year') unitDisplay = 'yr';

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
              ? formatValueWithUnits(params.value, params.row.target_units, params.row.direction)
              : 'No data'}
          </span>
        );
      },
    },
    {
      field: 'target_value',
      headerName: 'Target',
      width: 130,
      type: 'number',
      renderHeader: renderHeaderWithTooltipMap('target_value', 'Target', CSF_COLUMN_TOOLTIPS),
      renderCell: (params: GridRenderCellParams) => {
        const metric = params.row as Metric;
        const editing = isEditing(metric.id);
        const value = getEditValue(metric, 'target_value');
        // Abbreviate units for display
        let unitDisplay = metric.target_units;
        const unitsLower = metric.target_units?.toLowerCase();
        if (unitsLower === 'percent') unitDisplay = '%';
        else if (unitsLower === 'hours') unitDisplay = 'hrs';
        else if (unitsLower === 'hour') unitDisplay = 'hr';
        else if (unitsLower === 'years') unitDisplay = 'yrs';
        else if (unitsLower === 'year') unitDisplay = 'yr';

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
            {formatValueWithUnits(params.value, params.row.target_units, params.row.direction)}
          </span>
        );
      },
    },
    {
      field: 'metric_score',
      headerName: 'Score',
      width: 100,
      renderHeader: renderHeaderWithTooltipMap('metric_score', 'Score', CSF_COLUMN_TOOLTIPS),
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip
          title={params.value !== null && params.value !== undefined ? `${Math.round(params.value)}%` : 'N/A'}
          arrow
          placement="top"
        >
          <Box display="flex" alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
            <LinearProgress
              variant="determinate"
              value={params.value || 0}
              sx={{
                width: 70,
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getRiskColor(params.value),
                },
              }}
            />
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'owner_function',
      headerName: 'Owner',
      width: 120,
      renderHeader: renderHeaderWithTooltipMap('owner_function', 'Owner', CSF_COLUMN_TOOLTIPS),
    },
    {
      field: 'data_source',
      headerName: 'Data Source',
      width: 220,
      minWidth: 180,
      renderHeader: renderHeaderWithTooltipMap('data_source', 'Data Source', CSF_COLUMN_TOOLTIPS),
      renderCell: (params: GridRenderCellParams) => {
        const dataSource = params.value;
        if (!dataSource) {
          return <span style={{ color: '#9e9e9e' }}>-</span>;
        }
        return (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: 1.4,
            }}
          >
            {dataSource}
          </Typography>
        );
      },
    },
    {
      field: 'collection_frequency',
      headerName: 'Frequency',
      width: 100,
      renderHeader: renderHeaderWithTooltipMap('collection_frequency', 'Frequency', CSF_COLUMN_TOOLTIPS),
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
      renderHeader: renderHeaderWithTooltipMap('active', 'Status', CSF_COLUMN_TOOLTIPS),
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
      renderHeader: renderHeaderWithTooltipMap('actions', 'Actions', CSF_COLUMN_TOOLTIPS),
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
                <span>
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
                </span>
              </Tooltip>
            )}
            <Tooltip title="Edit in dialog">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleEditMetric(params.row)}
                  disabled={editing}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete metric">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteMetric(params.row)}
                  color="error"
                  disabled={editing}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
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
          {state.activeCatalog && (
            <Chip
              label={`Active: ${state.activeCatalog.name}`}
              color="primary"
              size="small"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FrameworkSelector size="small" />
          {state.catalogLoading && (
            <CircularProgress size={24} />
          )}
        </Box>
      </Box>

      {/* Summary Cards - These show totals independent of pagination/filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Metrics
              </Typography>
              <Typography variant="h5">{state.summaryStats.totalMetrics}</Typography>
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
                {state.summaryStats.activeMetrics}
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
                {state.summaryStats.highPriority}
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
                {state.summaryStats.needAttention}
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
              <InputLabel>{frameworkCode === 'ai_rmf' ? 'AI RMF Function' : 'CSF Function'}</InputLabel>
              <Select
                value={state.filters.function || ''}
                label={frameworkCode === 'ai_rmf' ? 'AI RMF Function' : 'CSF Function'}
                onChange={(e) => handleFilterChange('function', e.target.value || undefined)}
              >
                <MenuItem value="">All Functions</MenuItem>
                {frameworkCode === 'ai_rmf' ? (
                  Object.entries(AI_RMF_FUNCTION_NAMES).map(([key, name]) => (
                    <MenuItem key={key} value={key}>
                      {name}
                    </MenuItem>
                  ))
                ) : (
                  Object.entries(CSF_FUNCTION_NAMES).map(([key, name]) => (
                    <MenuItem key={key} value={key}>
                      {name}
                    </MenuItem>
                  ))
                )}
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
          {/* Metric Type filter - only show for CSF 2.0 framework */}
          {frameworkCode === 'csf_2_0' && (
            <Grid item xs={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Metric Type</InputLabel>
                <Select
                  value={state.filters.metric_type || 'all'}
                  label="Metric Type"
                  onChange={(e) => handleFilterChange('metric_type', e.target.value === 'all' ? undefined : e.target.value as MetricType)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="cyber">Cyber</MenuItem>
                  <MenuItem value="ai_profile">AI Profile</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} md={frameworkCode === 'csf_2_0' ? 3 : 4.5}>
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
              alignItems: 'center',
              py: 0.5,
            },
            '& .MuiDataGrid-row': {
              minHeight: '44px !important',
            },
            '& .MuiDataGrid-virtualScrollerContent': {
              '& .MuiDataGrid-row:first-of-type': {
                marginTop: 0,
              },
            },
            // Sticky lock column styles
            '& .sticky-lock-cell': {
              position: 'sticky',
              left: 0,
              zIndex: 2,
              backgroundColor: 'background.paper',
              borderRight: '1px solid',
              borderRightColor: 'divider',
            },
            '& .sticky-lock-header': {
              position: 'sticky',
              left: 0,
              zIndex: 3,
              backgroundColor: 'background.paper',
              borderRight: '1px solid',
              borderRightColor: 'divider',
            },
            // Ensure the scrollable area allows horizontal scroll
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
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
                      <InputLabel>{frameworkCode === 'ai_rmf' ? 'AI RMF Function' : 'CSF Function'}</InputLabel>
                      <Select
                        value={frameworkCode === 'ai_rmf'
                          ? (state.selectedMetric.ai_rmf_function || '')
                          : (state.selectedMetric.csf_function || '')}
                        label={frameworkCode === 'ai_rmf' ? 'AI RMF Function' : 'CSF Function'}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          selectedMetric: frameworkCode === 'ai_rmf'
                            ? { ...prev.selectedMetric!, ai_rmf_function: e.target.value as AIRMFFunction }
                            : { ...prev.selectedMetric!, csf_function: e.target.value as CSFFunction }
                        }))}
                      >
                        {frameworkCode === 'ai_rmf' ? (
                          Object.entries(AI_RMF_FUNCTION_NAMES).map(([key, name]) => (
                            <MenuItem key={key} value={key}>
                              {name}
                            </MenuItem>
                          ))
                        ) : (
                          Object.entries(CSF_FUNCTION_NAMES).map(([key, name]) => (
                            <MenuItem key={key} value={key}>
                              {name}
                            </MenuItem>
                          ))
                        )}
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

      {/* Update Type Selection Dialog */}
      <Dialog
        open={state.updateTypeDialogOpen}
        onClose={handleUpdateTypeCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Type</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You're changing the current value for "{state.pendingUpdateMetric?.name}".
            Please select the type of update:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper
              sx={{
                p: 2,
                cursor: 'pointer',
                border: '2px solid transparent',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => handleUpdateTypeConfirm(UpdateType.PERIOD_UPDATE)}
            >
              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                Period Update
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This is a new measurement for a new reporting period.
                The value will be recorded in trend/historical data and the audit log.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                Use this for regular metric updates (e.g., monthly collection)
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                cursor: 'pointer',
                border: '2px solid transparent',
                '&:hover': {
                  borderColor: 'warning.main',
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => handleUpdateTypeConfirm(UpdateType.ADJUSTMENT)}
            >
              <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                Adjustment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This is a correction or fix to the current value.
                The change will only be recorded in the audit log, NOT in trend data.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                Use this for fixing data entry errors or making corrections
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUpdateTypeCancel}>
            Cancel
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