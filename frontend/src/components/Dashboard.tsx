import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  NetworkCheck as NetworkCheckIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import apiClient from '../api/client';
import ScoreCard from './ScoreCard';
import { ContentFrame } from './layout';
import { DashboardSummary, RISK_RATING_COLORS, CSF_FUNCTION_NAMES, HealthResponse } from '../types';

interface DetailedError {
  message: string;
  status?: number;
  statusText?: string;
  url?: string;
  timestamp: Date;
  details?: any;
}

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [detailedError, setDetailedError] = useState<DetailedError | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Health check query
  const { data: health } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiClient.getHealth(),
    retry: 2,
    refetchInterval: 60000, // Check every minute
  });

  // Active catalog query
  const { data: activeCatalog } = useQuery({
    queryKey: ['active-catalog'],
    queryFn: async () => {
      try {
        const catalogs = await apiClient.getCatalogs('admin', true); // Get active catalogs only
        return catalogs.find(catalog => catalog.active) || {
          name: 'Default NIST CSF 2.0 Metrics',
          items_count: 208,
          owner: 'system',
          active: true,
          is_default: true
        };
      } catch (error) {
        // Fallback to default if no catalogs found
        return {
          name: 'Default NIST CSF 2.0 Metrics',
          items_count: 208,
          owner: 'system',
          active: true,
          is_default: true
        };
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Handle health check status changes
  useEffect(() => {
    if (health?.status) {
      setConnectionStatus('connected');
    }
  }, [health]);

  // Fetch dashboard data with enhanced error handling
  const { data: dashboard, isLoading, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching dashboard data...');
        const startTime = Date.now();
        const data = await apiClient.getDashboardSummary();
        const endTime = Date.now();
        console.log(`✅ Dashboard data loaded in ${endTime - startTime}ms`, data);
        setDetailedError(null); // Clear any previous errors
        return data;
      } catch (error: any) {
        console.error('❌ Dashboard data fetch failed:', error);
        
        // Create detailed error information
        const detailedError: DetailedError = {
          message: error.message || 'Unknown error occurred',
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          timestamp: new Date(),
          details: {
            baseURL: error.config?.baseURL,
            method: error.config?.method?.toUpperCase(),
            headers: error.config?.headers,
            responseData: error.response?.data,
          },
        };
        
        setDetailedError(detailedError);
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Retry up to 3 times, but not for 404 or 403 errors
      if (error?.response?.status === 404 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: false, // Only refresh when tab is active
  });

  // Connection status effect
  useEffect(() => {
    if (!error && !isLoading && dashboard) {
      setConnectionStatus('connected');
    } else if (error) {
      setConnectionStatus('disconnected');
    }
  }, [error, isLoading, dashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh initiated...');
      await apiClient.recalculateScores();
      await refetch();
      console.log('✅ Manual refresh completed');
    } catch (error: any) {
      console.error('❌ Manual refresh failed:', error);
      const detailedError: DetailedError = {
        message: `Refresh failed: ${error.message || 'Unknown error'}`,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        timestamp: new Date(),
        details: error.response?.data,
      };
      setDetailedError(detailedError);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    setDetailedError(null);
    refetch();
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'disconnected': return 'error';
      case 'checking': return 'warning';
      default: return 'info';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return `✅ Connected (API: ${health?.status || 'OK'})`;
      case 'disconnected': return '❌ Disconnected from API';
      case 'checking': return '⏳ Checking connection...';
      default: return '❓ Unknown status';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Loading dashboard data...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Fetching NIST CSF 2.0 metrics from API
        </Typography>
      </Box>
    );
  }

  if (error || detailedError) {
    return (
      <Box sx={{ mt: 2 }}>
        {/* Connection Status */}
        <Alert severity={getConnectionStatusColor() as any} sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <NetworkCheckIcon />
            {getConnectionStatusText()}
          </Box>
        </Alert>

        {/* Main Error Alert */}
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Dashboard Data Loading Failed
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {detailedError?.message || error?.message || 'Unable to load dashboard data from the API.'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={handleRetry} startIcon={<RefreshIcon />}>
              Retry
            </Button>
            <Button variant="outlined" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Recalculating...' : 'Recalculate & Retry'}
            </Button>
          </Box>
        </Alert>

        {/* Detailed Error Information */}
        {detailedError && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Technical Details
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Error Information:</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2"><strong>Time:</strong> {detailedError.timestamp.toLocaleString()}</Typography>
                    <Typography variant="body2"><strong>Status:</strong> {detailedError.status || 'N/A'} {detailedError.statusText}</Typography>
                    <Typography variant="body2"><strong>URL:</strong> {detailedError.url || 'Unknown'}</Typography>
                    <Typography variant="body2"><strong>Message:</strong> {detailedError.message}</Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Request Details:</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2"><strong>Base URL:</strong> {detailedError.details?.baseURL || 'N/A'}</Typography>
                    <Typography variant="body2"><strong>Method:</strong> {detailedError.details?.method || 'GET'}</Typography>
                    {detailedError.details?.responseData && (
                      <Typography variant="body2"><strong>Response:</strong> {JSON.stringify(detailedError.details.responseData, null, 2).substring(0, 200)}...</Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Troubleshooting Steps:</Typography>
                  <Typography variant="body2" component="div">
                    <ol>
                      <li>Ensure the backend API is running on <strong>http://localhost:8000</strong></li>
                      <li>Check if the database is connected and contains seeded metrics data</li>
                      <li>Verify CORS settings allow requests from <strong>http://localhost:5173</strong></li>
                      <li>Try accessing the API directly: <strong>http://localhost:8000/api/v1/health</strong></li>
                      <li>Run <code>docker-compose logs backend</code> to check backend logs</li>
                    </ol>
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No data available. Please ensure metrics are configured.
      </Alert>
    );
  }

  const overallRiskColor = RISK_RATING_COLORS[dashboard.overall_risk_rating];

  return (
    <ContentFrame>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Cybersecurity Risk Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            NIST Cybersecurity Framework 2.0 Risk Assessment
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                Metrics Catalog
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {activeCatalog?.name || 'Loading...'}
                </Typography>
                {activeCatalog && (
                  <Chip
                    size="small"
                    label="Active"
                    color="success"
                    icon={<CheckCircleIcon />}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {activeCatalog ? `${activeCatalog.items_count} metrics • ${activeCatalog.owner}` : 'Loading catalog information...'}
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(dashboard.last_updated).toLocaleString()}
          </Typography>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            size="small"
          >
            Refresh Scores
          </Button>
        </Box>
      </Box>

      {/* Overall Score Summary */}
      <Card sx={{ mb: 4, border: `2px solid ${overallRiskColor}30` }}>
        <CardContent sx={{ py: 4 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h1" sx={{ fontWeight: 700, color: overallRiskColor, mb: 2, fontSize: '3.5rem' }}>
                  {dashboard.overall_score_pct.toFixed(1)}%
                </Typography>
                <Chip
                  label={`${dashboard.overall_risk_rating.toUpperCase()} RISK`}
                  sx={{
                    backgroundColor: `${overallRiskColor}20`,
                    color: overallRiskColor,
                    fontWeight: 600,
                    fontSize: '1rem',
                    px: 3,
                    py: 1,
                  }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                      {dashboard.total_metrics}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Total Metrics
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main', mb: 1 }}>
                      {dashboard.metrics_at_target_pct.toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      At Target
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main', mb: 1 }}>
                      {dashboard.metrics_below_target}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Below Target
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main', mb: 1 }}>
                      {(dashboard.risk_distribution.high || 0) + (dashboard.risk_distribution.very_high || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      High Risk Functions
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* CSF Function Scores */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <AssessmentIcon />
          NIST CSF 2.0 Function Scores
        </Typography>
        
        <Grid container spacing={3}>
          {dashboard.function_scores.map((functionScore) => (
            <Grid item xs={12} sm={6} md={4} key={functionScore.function}>
              <ScoreCard
                functionScore={functionScore}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Metrics Needing Attention */}
      {dashboard.metrics_needing_attention.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              Metrics Needing Attention
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell>Function</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Target</TableCell>
                    <TableCell align="right">Gap</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell>Owner</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.metrics_needing_attention.slice(0, 10).map((metric) => (
                    <TableRow key={metric.id} hover>
                      <TableCell>
                        <Chip
                          label={metric.metric_number || 'N/A'}
                          size="small"
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 600,
                            backgroundColor: '#f5f5f5',
                            color: '#666666',
                            border: '1px solid #e0e0e0'
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Tooltip title={metric.name} placement="top">
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {metric.name}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={CSF_FUNCTION_NAMES[metric.csf_function as keyof typeof CSF_FUNCTION_NAMES]}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={metric.priority_rank === 1 ? 'High' : metric.priority_rank === 2 ? 'Med' : 'Low'}
                          size="small"
                          color={metric.priority_rank === 1 ? 'error' : metric.priority_rank === 2 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2">
                          {metric.current_label || metric.current_value?.toFixed(1)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2">
                          {metric.target_value?.toFixed(1)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={metric.gap_to_target_pct < 0 ? 'error' : 'success'}
                        >
                          {metric.gap_to_target_pct?.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            color: metric.score_pct < 40 ? 'error.main' : 
                                   metric.score_pct < 65 ? 'warning.main' : 
                                   metric.score_pct < 85 ? 'info.main' : 'success.main',
                            fontWeight: 600,
                          }}
                        >
                          {metric.score_pct?.toFixed(0)}%
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="caption">
                          {metric.owner_function}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </ContentFrame>
  );
}