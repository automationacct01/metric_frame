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
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';
import { ContentFrame } from './layout';
import {
  Metric,
  MetricFilters,
  CSFFunction,
  CSF_FUNCTION_NAMES,
  PRIORITY_NAMES,
  RISK_RATING_COLORS,
  RiskRating,
} from '../types';

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
}

export default function MetricsGrid() {
  const [state, setState] = useState<MetricsGridState>({
    metrics: [],
    loading: true,
    error: null,
    total: 0,
    pageSize: 25,
    page: 0,
    filters: {
      limit: 25,
      offset: 0,
    },
    selectedMetric: null,
    editDialogOpen: false,
    deleteDialogOpen: false,
    snackbarOpen: false,
    snackbarMessage: '',
    snackbarSeverity: 'info',
  });

  const showSnackbar = (message: string, severity: typeof state.snackbarSeverity = 'info') => {
    setState(prev => ({
      ...prev,
      snackbarMessage: message,
      snackbarSeverity: severity,
      snackbarOpen: true,
    }));
  };

  const loadMetrics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiClient.getMetrics({
        ...state.filters,
        limit: state.pageSize,
        offset: state.page * state.pageSize,
      });
      
      setState(prev => ({
        ...prev,
        metrics: response.items,
        total: response.total,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load metrics. Please try again.',
      }));
    }
  }, [state.filters, state.pageSize, state.page]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleFilterChange = (field: keyof MetricFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [field]: value },
      page: 0,
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

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportMetricsCSV(state.filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metrics.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showSnackbar('Metrics exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export metrics:', error);
      showSnackbar('Failed to export metrics', 'error');
    }
  };

  const getRiskColor = (score?: number): string => {
    if (score === undefined) return '#9e9e9e';
    if (score >= 85) return RISK_RATING_COLORS[RiskRating.LOW];
    if (score >= 65) return RISK_RATING_COLORS[RiskRating.MODERATE];
    if (score >= 40) return RISK_RATING_COLORS[RiskRating.ELEVATED];
    return RISK_RATING_COLORS[RiskRating.HIGH];
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Metric Name',
      width: 250,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.row.description || 'No description'}>
          <span>{params.value}</span>
        </Tooltip>
      ),
    },
    {
      field: 'csf_function',
      headerName: 'CSF Function',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={CSF_FUNCTION_NAMES[params.value as CSFFunction]}
          size="small"
          color="primary"
        />
      ),
    },
    {
      field: 'priority_rank',
      headerName: 'Priority',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={PRIORITY_NAMES[params.value as number] || 'Unknown'}
          size="small"
          color={params.value === 1 ? 'error' : params.value === 2 ? 'warning' : 'default'}
        />
      ),
    },
    {
      field: 'current_value',
      headerName: 'Current Value',
      width: 130,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span>
          {params.value !== null && params.value !== undefined 
            ? `${params.value}${params.row.target_units || ''}` 
            : 'No data'}
        </span>
      ),
    },
    {
      field: 'target_value',
      headerName: 'Target',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span>
          {params.value !== null && params.value !== undefined
            ? `${params.value}${params.row.target_units || ''}`
            : 'N/A'}
        </span>
      ),
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
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEditMetric(params.row)}
            title="Edit metric"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteMetric(params.row)}
            title="Delete metric"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <ContentFrame>
      <Typography variant="h4" component="h1" gutterBottom>
        Metrics Catalog
      </Typography>

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
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search"
              value={state.filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search metrics..."
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
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
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={state.filters.priority_rank || ''}
                label="Priority"
                onChange={(e) => handleFilterChange('priority_rank', e.target.value || undefined)}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value={1}>High</MenuItem>
                <MenuItem value={2}>Medium</MenuItem>
                <MenuItem value={3}>Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
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
          <Grid item xs={12} md={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setState(prev => ({ ...prev, selectedMetric: {} as Metric, editDialogOpen: true }))}
              >
                Add Metric
              </Button>
              <IconButton onClick={loadMetrics} title="Refresh">
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={handleExport} title="Export CSV">
                <ExportIcon />
              </IconButton>
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
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={state.metrics}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: state.pageSize,
              },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          rowCount={state.total}
          paginationMode="server"
          loading={state.loading}
          onPaginationModelChange={(model) => {
            setState(prev => ({ ...prev, page: model.page, pageSize: model.pageSize }));
          }}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={state.editDialogOpen}
        onClose={() => setState(prev => ({ ...prev, editDialogOpen: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {state.selectedMetric?.id ? 'Edit Metric' : 'Add New Metric'}
        </DialogTitle>
        <DialogContent>
          {state.selectedMetric && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
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
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Current Value"
                  value={state.selectedMetric.current_value || ''}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    selectedMetric: { ...prev.selectedMetric!, current_value: Number(e.target.value) }
                  }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Target Value"
                  value={state.selectedMetric.target_value || ''}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    selectedMetric: { ...prev.selectedMetric!, target_value: Number(e.target.value) }
                  }))}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, editDialogOpen: false }))}>
            Cancel
          </Button>
          <Button onClick={handleSaveMetric} variant="contained">
            Save
          </Button>
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