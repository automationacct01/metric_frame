import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  ButtonGroup,
  CircularProgress,
  Alert,
  AlertTitle,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  CompareArrows as CompareArrowsIcon,
  Assessment as AssessmentIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
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
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Bar,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';

interface TrendComparisonProps {
  functionCode?: string;
  showAllFunctions?: boolean;
  height?: number;
}

interface PeriodComparison {
  current_period: {
    start_date: string;
    end_date: string;
    average_score: number;
  };
  previous_period: {
    start_date: string;
    end_date: string;
    average_score: number;
  };
  change_pct: number;
  trend: 'up' | 'down' | 'flat';
}

type TimeframeDays = 7 | 30 | 90;

const TIMEFRAME_OPTIONS: { label: string; days: TimeframeDays }[] = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const TrendComparison: React.FC<TrendComparisonProps> = ({
  functionCode,
  showAllFunctions = false,
  height = 300,
}) => {
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeDays>(30);

  // Fetch trend data for a specific function or all functions
  const {
    data: trendData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['function-trend', functionCode, selectedTimeframe, frameworkCode],
    queryFn: () =>
      functionCode
        ? apiClient.getFunctionTrend(functionCode, selectedTimeframe)
        : apiClient.getFrameworkScores(frameworkCode),
    enabled: !!frameworkCode,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate period comparison from trend data
  const calculatePeriodComparison = (data: any): PeriodComparison | null => {
    if (!data?.trend_data || data.trend_data.length < 2) return null;

    const trendPoints = data.trend_data;
    const midpoint = Math.floor(trendPoints.length / 2);

    const previousPeriod = trendPoints.slice(0, midpoint);
    const currentPeriod = trendPoints.slice(midpoint);

    const previousAvg = previousPeriod.reduce((sum: number, p: any) => sum + (p.score_pct || 0), 0) / previousPeriod.length;
    const currentAvg = currentPeriod.reduce((sum: number, p: any) => sum + (p.score_pct || 0), 0) / currentPeriod.length;

    const changePct = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      current_period: {
        start_date: currentPeriod[0]?.date || '',
        end_date: currentPeriod[currentPeriod.length - 1]?.date || '',
        average_score: currentAvg,
      },
      previous_period: {
        start_date: previousPeriod[0]?.date || '',
        end_date: previousPeriod[previousPeriod.length - 1]?.date || '',
        average_score: previousAvg,
      },
      change_pct: changePct,
      trend: changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'flat',
    };
  };

  const periodComparison = trendData ? calculatePeriodComparison(trendData) : null;

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon sx={{ color: 'success.main' }} />;
      case 'down': return <TrendingDownIcon sx={{ color: 'error.main' }} />;
      default: return <TrendingFlatIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up': return 'success';
      case 'down': return 'error';
      default: return 'info';
    }
  };

  const getChangeText = (changePct: number) => {
    if (changePct > 0) return `+${changePct.toFixed(1)}%`;
    return `${changePct.toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(1)}%
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

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
        Failed to load trend data.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with Timeframe Selection */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6">
            Period Comparison
          </Typography>
        </Box>

        <ButtonGroup size="small" variant="outlined">
          {TIMEFRAME_OPTIONS.map((option) => (
            <Button
              key={option.days}
              variant={selectedTimeframe === option.days ? 'contained' : 'outlined'}
              onClick={() => setSelectedTimeframe(option.days)}
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Period Comparison Cards */}
      {periodComparison && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Previous Period */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Previous Period
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {periodComparison.previous_period.start_date} - {periodComparison.previous_period.end_date}
                </Typography>
                <Typography variant="h4">
                  {periodComparison.previous_period.average_score.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Change Indicator */}
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: `${getTrendColor(periodComparison.trend)}.50` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Change
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 1 }}>
                  {getTrendIcon(periodComparison.trend)}
                  <Typography
                    variant="h4"
                    color={`${getTrendColor(periodComparison.trend)}.main`}
                    fontWeight="bold"
                  >
                    {getChangeText(periodComparison.change_pct)}
                  </Typography>
                </Box>
                <Chip
                  label={periodComparison.trend === 'up' ? 'Improving' : periodComparison.trend === 'down' ? 'Declining' : 'Stable'}
                  color={getTrendColor(periodComparison.trend) as any}
                  size="small"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Current Period */}
          <Grid item xs={12} md={4}>
            <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current Period
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {periodComparison.current_period.start_date} - {periodComparison.current_period.end_date}
                </Typography>
                <Typography variant="h4" color="primary">
                  {periodComparison.current_period.average_score.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Trend Chart */}
      {trendData?.trend_data && trendData.trend_data.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Score Trend ({selectedTimeframe} Days)
          </Typography>

          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={trendData.trend_data}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />

              {/* Reference lines for targets */}
              <ReferenceLine y={85} stroke="#4caf50" strokeDasharray="5 5" label={{ value: 'Low Risk', fill: '#4caf50', fontSize: 10 }} />
              <ReferenceLine y={65} stroke="#ff9800" strokeDasharray="5 5" label={{ value: 'Moderate', fill: '#ff9800', fontSize: 10 }} />
              <ReferenceLine y={40} stroke="#f44336" strokeDasharray="5 5" label={{ value: 'High Risk', fill: '#f44336', fontSize: 10 }} />

              <Area
                type="monotone"
                dataKey="score_pct"
                stroke="#1976d2"
                fill="url(#colorScore)"
                name="Score"
              />
              <Line
                type="monotone"
                dataKey="score_pct"
                stroke="#1976d2"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                name="Score"
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend for risk levels */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
            <Chip
              size="small"
              label="Low Risk (≥85%)"
              sx={{ bgcolor: '#4caf5020', color: '#4caf50' }}
            />
            <Chip
              size="small"
              label="Moderate (65-84%)"
              sx={{ bgcolor: '#ff980020', color: '#ff9800' }}
            />
            <Chip
              size="small"
              label="High Risk (<65%)"
              sx={{ bgcolor: '#f4433620', color: '#f44336' }}
            />
          </Box>
        </Paper>
      )}

      {/* No data message */}
      {(!trendData?.trend_data || trendData.trend_data.length === 0) && (
        <Alert severity="info">
          <AlertTitle>No Trend Data</AlertTitle>
          Historical data is not yet available for this period. Trends will appear as metric data is collected over time.
        </Alert>
      )}
    </Box>
  );
};

export default TrendComparison;
