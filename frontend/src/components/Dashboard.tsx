import React, { useState } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

import apiClient from '../api/client';
import ScoreCard from './ScoreCard';
import { DashboardSummary, RISK_RATING_COLORS, CSF_FUNCTION_NAMES } from '../types';

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const { data: dashboard, isLoading, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient.getDashboardSummary(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiClient.recalculateScores();
      await refetch();
    } catch (error) {
      console.error('Error refreshing scores:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading dashboard data. Please try again later.
      </Alert>
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
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Cybersecurity Risk Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            NIST Cybersecurity Framework 2.0 Risk Assessment
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
      <Card sx={{ mb: 3, border: `2px solid ${overallRiskColor}30` }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 700, color: overallRiskColor, mb: 1 }}>
                  {dashboard.overall_score_pct.toFixed(1)}%
                </Typography>
                <Chip
                  label={`${dashboard.overall_risk_rating.toUpperCase()} RISK`}
                  sx={{
                    backgroundColor: `${overallRiskColor}20`,
                    color: overallRiskColor,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    px: 2,
                  }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {dashboard.total_metrics}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Metrics
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {dashboard.metrics_at_target_pct.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      At Target
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      {dashboard.metrics_below_target}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Below Target
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {dashboard.risk_distribution.high + dashboard.risk_distribution.elevated}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon />
          NIST CSF 2.0 Function Scores
        </Typography>
        
        <Grid container spacing={2}>
          {dashboard.function_scores.map((functionScore) => (
            <Grid item xs={12} sm={6} md={4} key={functionScore.function}>
              <ScoreCard
                functionScore={functionScore}
                onClick={() => {
                  // Navigate to filtered metrics view
                  // This would be implemented with router navigation
                  console.log(`Clicked on ${functionScore.function} function`);
                }}
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
    </Box>
  );
}