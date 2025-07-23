import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import apiClient from '../api/client';
import { ContentFrame } from './layout';
import {
  CategoryScoresResponse,
  FunctionScore,
  CSF_FUNCTION_NAMES,
  CSF_FUNCTION_DESCRIPTIONS,
  RISK_RATING_COLORS,
  PRIORITY_NAMES,
} from '../types';

const formatRiskRating = (riskRating: string): string => {
  return riskRating.replace('_', ' ').toUpperCase();
};

export default function FunctionDetail() {
  const { functionCode } = useParams<{ functionCode: string }>();
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState(30);

  // Fetch function categories
  const { data: categoryData, isLoading: categoriesLoading, error: categoriesError } = useQuery<CategoryScoresResponse>({
    queryKey: ['function-categories', functionCode],
    queryFn: () => apiClient.getFunctionCategories(functionCode!),
    enabled: !!functionCode,
  });

  // Fetch function score
  const { data: functionScore, isLoading: functionScoreLoading } = useQuery<FunctionScore>({
    queryKey: ['function-score', functionCode],
    queryFn: () => apiClient.getFunctionScore(functionCode!),
    enabled: !!functionCode,
  });

  // Fetch trend data
  const { data: trendData } = useQuery({
    queryKey: ['function-trend', functionCode, selectedTimeframe],
    queryFn: () => apiClient.getFunctionTrend(functionCode!, selectedTimeframe),
    enabled: !!functionCode,
  });

  // Fetch metrics needing attention for this function
  const { data: attentionMetrics } = useQuery({
    queryKey: ['metrics-attention', functionCode],
    queryFn: () => apiClient.getMetricsNeedingAttention(10),
    enabled: !!functionCode,
    select: (data) => data.filter((metric: any) => metric.csf_function === functionCode),
  });

  if (!functionCode) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Invalid function code provided
      </Alert>
    );
  }

  const functionName = CSF_FUNCTION_NAMES[functionCode as keyof typeof CSF_FUNCTION_NAMES];
  const functionDescription = CSF_FUNCTION_DESCRIPTIONS[functionCode as keyof typeof CSF_FUNCTION_DESCRIPTIONS];

  if (categoriesLoading || functionScoreLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Loading function details...
        </Typography>
      </Box>
    );
  }

  if (categoriesError || !categoryData || !functionScore) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">
          Failed to load function details. Please try again.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const getRiskColor = (score: number): string => {
    if (score >= 90) return RISK_RATING_COLORS['very_low'];
    if (score >= 75) return RISK_RATING_COLORS['low'];
    if (score >= 50) return RISK_RATING_COLORS['medium'];
    if (score >= 30) return RISK_RATING_COLORS['high'];
    return RISK_RATING_COLORS['very_high'];
  };

  return (
    <ContentFrame>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            {functionName} Function Detail
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {functionDescription}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {[30, 60, 90].map((days) => (
            <Button
              key={days}
              variant={selectedTimeframe === days ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setSelectedTimeframe(days)}
            >
              {days} days
            </Button>
          ))}
        </Box>
      </Box>

      {/* Overall Function Score Display */}
      <Card sx={{ mb: 4, border: `2px solid ${RISK_RATING_COLORS[functionScore.risk_rating]}20` }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Overall {functionName} Function Score
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aggregated score across all {categoryData.total_categories} categories
              </Typography>
            </Box>
            
            <Chip
              label={formatRiskRating(functionScore.risk_rating)}
              size="medium"
              sx={{
                backgroundColor: `${RISK_RATING_COLORS[functionScore.risk_rating]}20`,
                color: RISK_RATING_COLORS[functionScore.risk_rating],
                fontWeight: 600,
                fontSize: '0.875rem',
                px: 2,
                py: 1,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                color: RISK_RATING_COLORS[functionScore.risk_rating],
                minWidth: '120px'
              }}
            >
              {functionScore.score_pct.toFixed(1)}%
            </Typography>
            
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={functionScore.score_pct}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: RISK_RATING_COLORS[functionScore.risk_rating],
                    borderRadius: 6,
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {functionScore.metrics_count} total metrics
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {functionScore.metrics_below_target_count} below target
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Function Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Categories
              </Typography>
              <Typography variant="h5">{categoryData.total_categories}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Categories At Risk
              </Typography>
              <Typography variant="h5" color="error">
                {categoryData.category_scores.filter(c => c.score_pct < 50).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Metrics
              </Typography>
              <Typography variant="h5">
                {categoryData.category_scores.reduce((sum, c) => sum + c.metrics_count, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Below Target
              </Typography>
              <Typography variant="h5" color="warning.main">
                {categoryData.category_scores.reduce((sum, c) => sum + c.metrics_below_target_count, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Trend Chart */}
      {trendData && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon />
              Score Trend ({selectedTimeframe} days)
            </Typography>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={trendData.trend_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score_pct"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="Score %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            {trendData.note && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {trendData.note}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Category Breakdown
          </Typography>
          
          <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
            {categoryData.category_scores.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.category_code} sx={{ display: 'flex' }}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    border: `2px solid ${getRiskColor(category.score_pct)}20`,
                    height: 'auto',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                  }}
                  onClick={() => {
                    // Future: Navigate to category detail
                    console.log(`Navigate to category ${category.category_code}`);
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1, pr: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {category.category_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {category.category_code}
                        </Typography>
                        {category.category_description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              lineHeight: 1.4,
                              mb: 2,
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              hyphens: 'auto',
                              textAlign: 'left'
                            }}
                          >
                            {category.category_description}
                          </Typography>
                        )}
                      </Box>
                      
                      <Chip
                        label={formatRiskRating(category.risk_rating)}
                        size="small"
                        sx={{
                          backgroundColor: `${getRiskColor(category.score_pct)}20`,
                          color: getRiskColor(category.score_pct),
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>

                    {/* Score Display */}
                    <Box sx={{ mt: 'auto', mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: getRiskColor(category.score_pct) }}>
                          {category.score_pct.toFixed(1)}%
                        </Typography>
                      </Box>
                      
                      <LinearProgress
                        variant="determinate"
                        value={category.score_pct}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getRiskColor(category.score_pct),
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>

                    {/* Metrics Summary */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {category.metrics_count} metrics
                      </Typography>
                      
                      {category.metrics_below_target_count > 0 && (
                        <Chip
                          label={`${category.metrics_below_target_count} below target`}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Metrics Needing Attention */}
      {attentionMetrics && attentionMetrics.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="warning" />
              Metrics Needing Attention
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Target</TableCell>
                    <TableCell align="right">Gap</TableCell>
                    <TableCell align="right">Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attentionMetrics.slice(0, 5).map((metric: any) => (
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
                          label={PRIORITY_NAMES[metric.priority_rank] || 'Unknown'}
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
                            color: metric.score_pct < 30 ? 'error.main' : 
                                   metric.score_pct < 50 ? 'warning.main' : 
                                   metric.score_pct < 75 ? 'info.main' : 
                                   metric.score_pct < 90 ? 'success.main' : 'success.dark',
                            fontWeight: 600,
                          }}
                        >
                          {metric.score_pct?.toFixed(0)}%
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