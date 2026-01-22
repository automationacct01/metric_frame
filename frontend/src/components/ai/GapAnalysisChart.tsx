import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';

interface FunctionDistribution {
  function_code: string;
  function_name: string;
  metrics_count: number;
  coverage_pct: number;
  color_hex?: string;
}

interface GapAnalysisChartProps {
  showRadar?: boolean;
  showBar?: boolean;
  height?: number;
}

// Default colors for CSF functions
const FUNCTION_COLORS: Record<string, string> = {
  gv: '#9c27b0',  // Purple - Govern
  id: '#2196f3',  // Blue - Identify
  pr: '#4caf50',  // Green - Protect
  de: '#ff9800',  // Orange - Detect
  rs: '#f44336',  // Red - Respond
  rc: '#00bcd4',  // Teal - Recover
  // AI RMF functions
  govern: '#9c27b0',
  map: '#2196f3',
  measure: '#4caf50',
  manage: '#ff9800',
};

const GapAnalysisChart: React.FC<GapAnalysisChartProps> = ({
  showRadar = true,
  showBar = true,
  height = 300,
}) => {
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  // Fetch metrics distribution
  const {
    data: distribution,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['metrics-distribution', frameworkCode],
    queryFn: () => apiClient.getMetricsDistribution(frameworkCode),
    staleTime: 5 * 60 * 1000,
    enabled: !!frameworkCode,
  });

  // Fetch coverage gaps
  const { data: coverageGaps } = useQuery({
    queryKey: ['coverage-gaps', frameworkCode],
    queryFn: () => apiClient.getCoverageGaps(frameworkCode),
    staleTime: 5 * 60 * 1000,
    enabled: !!frameworkCode,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        Failed to load gap analysis data.
      </Alert>
    );
  }

  // Transform data for charts
  const chartData = Object.entries(distribution?.function_distribution || {}).map(
    ([code, data]: [string, any]) => ({
      name: data.function_name || code.toUpperCase(),
      code,
      coverage: data.coverage_pct || 0,
      metrics: data.metrics_count || 0,
      fullMark: 100,
      color: data.color_hex || FUNCTION_COLORS[code.toLowerCase()] || '#666',
    })
  );

  // Calculate overall coverage
  const overallCoverage = chartData.length > 0
    ? chartData.reduce((sum, item) => sum + item.coverage, 0) / chartData.length
    : 0;

  // Identify gaps (functions with coverage below 50%)
  const significantGaps = chartData.filter(item => item.coverage < 50);
  const moderateGaps = chartData.filter(item => item.coverage >= 50 && item.coverage < 75);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 75) return '#4caf50';
    if (coverage >= 50) return '#ff9800';
    return '#f44336';
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">{data.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Coverage: {data.coverage.toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Metrics: {data.metrics}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ mr: 1, color: getCoverageColor(overallCoverage) }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Overall Coverage
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: getCoverageColor(overallCoverage) }}>
                {overallCoverage.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={overallCoverage}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(overallCoverage),
                    borderRadius: 3,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon sx={{ mr: 1, color: significantGaps.length > 0 ? 'error.main' : 'success.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Critical Gaps
                </Typography>
              </Box>
              <Typography variant="h4" color={significantGaps.length > 0 ? 'error.main' : 'success.main'}>
                {significantGaps.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Functions below 50% coverage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Metrics
                </Typography>
              </Box>
              <Typography variant="h4">
                {chartData.reduce((sum, item) => sum + item.metrics, 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across {chartData.length} functions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Bar Chart */}
        {showBar && (
          <Grid item xs={12} md={showRadar ? 6 : 12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage by Function
              </Typography>
              <ResponsiveContainer width="100%" height={height}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="coverage" name="Coverage %">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCoverageColor(entry.coverage)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Radar Chart */}
        {showRadar && (
          <Grid item xs={12} md={showBar ? 6 : 12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={height}>
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Coverage"
                    dataKey="coverage"
                    stroke="#2196f3"
                    fill="#2196f3"
                    fillOpacity={0.5}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Gap Details */}
      {(significantGaps.length > 0 || moderateGaps.length > 0) && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Gap Analysis Details
          </Typography>

          {significantGaps.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Critical Coverage Gaps</AlertTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {significantGaps.map((gap) => (
                  <Chip
                    key={gap.code}
                    label={`${gap.name}: ${gap.coverage.toFixed(0)}%`}
                    color="error"
                    size="small"
                    icon={<WarningIcon />}
                  />
                ))}
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                These functions have less than 50% metric coverage and need immediate attention.
              </Typography>
            </Alert>
          )}

          {moderateGaps.length > 0 && (
            <Alert severity="warning">
              <AlertTitle>Moderate Coverage Gaps</AlertTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {moderateGaps.map((gap) => (
                  <Chip
                    key={gap.code}
                    label={`${gap.name}: ${gap.coverage.toFixed(0)}%`}
                    color="warning"
                    size="small"
                  />
                ))}
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Consider adding more metrics to improve coverage in these areas.
              </Typography>
            </Alert>
          )}
        </Paper>
      )}

      {/* All functions covered well */}
      {significantGaps.length === 0 && moderateGaps.length === 0 && chartData.length > 0 && (
        <Alert severity="success" sx={{ mt: 3 }} icon={<CheckCircleIcon />}>
          <AlertTitle>Excellent Coverage!</AlertTitle>
          All framework functions have at least 75% metric coverage. Your security monitoring is comprehensive.
        </Alert>
      )}
    </Box>
  );
};

export default GapAnalysisChart;
