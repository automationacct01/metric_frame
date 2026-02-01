import React, { useState, useEffect } from 'react';
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
  TableSortLabel,
  Paper,
  Collapse,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  FileDownload as FileDownloadIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import apiClient from '../api/client';
import { ContentFrame } from './layout';
import {
  CategoryDetailScore,
  CategoryMetric,
  MetricVersionResponse,
  RISK_RATING_COLORS,
  PRIORITY_NAMES,
} from '../types';
import { useFramework } from '../contexts/FrameworkContext';
import { FrameworkSelector } from './FrameworkSelector';

const formatRiskRating = (riskRating: string): string => {
  return riskRating.replace('_', ' ').toUpperCase();
};

type SortField = 'name' | 'score_pct' | 'gap_to_target_pct' | 'priority_rank';
type SortOrder = 'asc' | 'desc';

interface ExpandedRowProps {
  metric: CategoryMetric;
}

function ExpandedMetricRow({ metric }: ExpandedRowProps) {
  return (
    <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Risk Definition
          </Typography>
          <Typography variant="body2">
            {metric.risk_definition || 'Not specified'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Business Impact
          </Typography>
          <Typography variant="body2">
            {metric.business_impact || 'Not specified'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Formula
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {metric.formula || 'Not specified'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Collection Frequency
          </Typography>
          <Typography variant="body2">
            {metric.collection_frequency || 'Not specified'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Last Collected
          </Typography>
          <Typography variant="body2">
            {metric.last_collected_at
              ? new Date(metric.last_collected_at).toLocaleDateString()
              : 'Not specified'}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function CategoryDetail() {
  const { functionCode, categoryCode } = useParams<{ functionCode: string; categoryCode: string }>();
  const navigate = useNavigate();
  const { selectedFramework } = useFramework();

  // State for table controls
  const [sortField, setSortField] = useState<SortField>('priority_rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<number | ''>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedTimeframe, setSelectedTimeframe] = useState<7 | 30 | 90>(30);
  const [trendViewMode, setTrendViewMode] = useState<'overall' | 'metrics' | 'both'>('both');
  const [trendMetricFilter, setTrendMetricFilter] = useState<string>('');

  // Fetch category details
  const { data: categoryData, isLoading, error } = useQuery<CategoryDetailScore>({
    queryKey: ['category-details', categoryCode],
    queryFn: () => apiClient.getCategoryDetails(categoryCode!),
    enabled: !!categoryCode,
  });

  // Fetch risk thresholds for context (used in future visualizations)
  const { data: _thresholds } = useQuery({
    queryKey: ['risk-thresholds'],
    queryFn: () => apiClient.getRiskThresholds(),
  });

  // State for recent changes (audit trail)
  interface RecentChange {
    timestamp: string;
    metricName: string;
    metricId: string;
    fieldChanged: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    changeSource: string;
  }
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);

  // Fetch version history for all metrics in the category
  useEffect(() => {
    if (!categoryData?.metrics?.length) return;

    const fetchVersions = async () => {
      setLoadingChanges(true);
      try {
        const allChanges: RecentChange[] = [];

        // Fetch versions for each metric (limit to 5 most recent per metric)
        await Promise.all(
          categoryData.metrics.map(async (metric) => {
            try {
              const versions = await apiClient.getMetricVersions(metric.id, 5);

              // Convert versions to change entries
              // Versions are sorted most recent first (versions[0] = latest)
              // Snapshot captures the BEFORE state of each change
              for (let i = 0; i < versions.length; i++) {
                const version = versions[i];

                // For each changed field, create a change entry
                if (version.changed_fields?.length) {
                  for (const field of version.changed_fields) {
                    // OLD value is from this version's snapshot (the BEFORE state)
                    const oldVal = version.snapshot_json?.[field];

                    // NEW value: for latest version, use current metric value
                    // For older versions, use the more recent version's snapshot
                    let newVal: any;
                    if (i === 0) {
                      // Latest version - get current value from metric
                      newVal = (metric as any)[field];
                    } else {
                      // Older version - the "new" value is the next version's "old" value
                      newVal = versions[i - 1]?.snapshot_json?.[field];
                    }

                    allChanges.push({
                      timestamp: version.created_at,
                      metricName: metric.name,
                      metricId: metric.id,
                      fieldChanged: field.replace(/_/g, ' '),
                      oldValue: oldVal !== undefined ? String(oldVal) : '-',
                      newValue: newVal !== undefined ? String(newVal) : '-',
                      changedBy: version.changed_by || 'system',
                      changeSource: version.change_source || 'api',
                    });
                  }
                }
              }
            } catch (err) {
              // Silently handle errors for individual metrics
              console.warn(`Failed to fetch versions for metric ${metric.id}:`, err);
            }
          })
        );

        // Sort by timestamp (most recent first) and limit to 20 entries
        allChanges.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentChanges(allChanges.slice(0, 20));
      } catch (err) {
        console.error('Failed to fetch version history:', err);
      } finally {
        setLoadingChanges(false);
      }
    };

    fetchVersions();
  }, [categoryData?.metrics]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleRowExpansion = (metricId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(metricId)) {
      newExpanded.delete(metricId);
    } else {
      newExpanded.add(metricId);
    }
    setExpandedRows(newExpanded);
  };

  const handleExportCSV = () => {
    if (!categoryData) return;

    const headers = ['Metric', 'Score %', 'Current', 'Target', 'Gap %', 'Priority', 'Owner'];
    const rows = categoryData.metrics.map(m => [
      m.name,
      m.score_pct?.toFixed(1) || 'N/A',
      m.current_value?.toString() || 'N/A',
      m.target_value?.toString() || 'N/A',
      m.gap_to_target_pct?.toFixed(1) || 'N/A',
      PRIORITY_NAMES[m.priority_rank] || 'Unknown',
      m.owner_function || 'N/A',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${categoryCode}_metrics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAIExplain = () => {
    // Navigate to AI assistant with category context
    const context = encodeURIComponent(
      `Analyze the ${categoryData?.category_name} (${categoryCode}) category which has a score of ${categoryData?.score_pct?.toFixed(1)}%. ` +
      `There are ${categoryData?.metrics_below_target_count} metrics below target out of ${categoryData?.metrics_count} total. ` +
      `Explain why this category might be underperforming and suggest specific improvement actions.`
    );
    navigate(`/app/ai-assistant?context=${context}`);
  };

  if (!categoryCode || !functionCode) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Invalid category or function code provided
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Loading category details...
        </Typography>
      </Box>
    );
  }

  if (error || !categoryData) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">
          Failed to load category details. Please try again.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/app/functions/${functionCode}`)}
          sx={{ mt: 2 }}
        >
          Back to Function
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

  // Filter and sort metrics
  const filteredMetrics = categoryData.metrics
    .filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === '' || m.priority_rank === priorityFilter;
      return matchesSearch && matchesPriority;
    })
    .sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'score_pct':
          aVal = a.score_pct ?? 0;
          bVal = b.score_pct ?? 0;
          break;
        case 'gap_to_target_pct':
          aVal = a.gap_to_target_pct ?? 0;
          bVal = b.gap_to_target_pct ?? 0;
          break;
        case 'priority_rank':
          aVal = a.priority_rank;
          bVal = b.priority_rank;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  // Generate insights
  const insights = generateInsights(categoryData);

  return (
    <ContentFrame>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/app/functions/${functionCode}`)}
            >
              Back to {functionCode.toUpperCase()}
            </Button>
            <FrameworkSelector size="small" />
          </Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {categoryCode} - {categoryData.category_name}
          </Typography>
          {categoryData.category_description && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: 800 }}>
              {categoryData.category_description}
            </Typography>
          )}
          {selectedFramework && (
            <Chip
              label={selectedFramework.name}
              size="small"
              sx={{ mt: 1 }}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </Box>

      {/* Section A: Category Score Summary */}
      <Card sx={{ mb: 4, border: `2px solid ${getRiskColor(categoryData.score_pct)}20` }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Category Score
            </Typography>
            <Chip
              label={formatRiskRating(categoryData.risk_rating)}
              size="medium"
              sx={{
                backgroundColor: `${getRiskColor(categoryData.score_pct)}20`,
                color: getRiskColor(categoryData.score_pct),
                fontWeight: 600,
                fontSize: '0.875rem',
                px: 2,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                color: getRiskColor(categoryData.score_pct),
                minWidth: '140px'
              }}
            >
              {categoryData.score_pct.toFixed(1)}%
            </Typography>

            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={categoryData.score_pct}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getRiskColor(categoryData.score_pct),
                    borderRadius: 6,
                  },
                }}
              />
            </Box>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {categoryData.metrics_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Metrics
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {categoryData.metrics_count - categoryData.metrics_below_target_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    At Target
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {categoryData.metrics_below_target_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Below Target
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Section B: Score Trend */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon />
              Score Trend
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* View Mode Toggle */}
              <Box sx={{ display: 'flex', gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                <Button
                  size="small"
                  variant={trendViewMode === 'overall' ? 'contained' : 'text'}
                  onClick={() => setTrendViewMode('overall')}
                  sx={{ minWidth: 70 }}
                >
                  Overall
                </Button>
                <Button
                  size="small"
                  variant={trendViewMode === 'metrics' ? 'contained' : 'text'}
                  onClick={() => setTrendViewMode('metrics')}
                  sx={{ minWidth: 70 }}
                >
                  Metrics
                </Button>
                <Button
                  size="small"
                  variant={trendViewMode === 'both' ? 'contained' : 'text'}
                  onClick={() => setTrendViewMode('both')}
                  sx={{ minWidth: 70 }}
                >
                  Both
                </Button>
              </Box>

              {/* Metric Filter */}
              {(trendViewMode === 'metrics' || trendViewMode === 'both') && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter Metric</InputLabel>
                  <Select
                    value={trendMetricFilter || ''}
                    label="Filter Metric"
                    onChange={(e) => setTrendMetricFilter(e.target.value as string)}
                  >
                    <MenuItem value="">Show All Metrics</MenuItem>
                    {categoryData.metrics.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        <Tooltip
                          title={m.name.length > 30 ? m.name : ''}
                          placement="right"
                          arrow
                        >
                          <Box component="span" sx={{ width: '100%', display: 'block' }}>
                            {m.name.length > 30 ? m.name.substring(0, 30) + '...' : m.name}
                          </Box>
                        </Tooltip>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Timeframe */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {([7, 30, 90] as const).map((days) => (
                  <Button
                    key={days}
                    variant={selectedTimeframe === days ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setSelectedTimeframe(days)}
                  >
                    {days}d
                  </Button>
                ))}
              </Box>

              {/* Reset Button */}
              <Tooltip title="Reset to defaults" arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    setTrendViewMode('both');
                    setTrendMetricFilter('');
                    setSelectedTimeframe(30);
                  }}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ height: 320, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart
                data={generateAllMetricsTrendData(categoryData, selectedTimeframe)}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={75} stroke="#059669" strokeDasharray="5 5" />

                {/* Category Overall - bold distinct line */}
                {(trendViewMode === 'overall' || trendViewMode === 'both') && (
                  <Line
                    type="monotone"
                    dataKey="category"
                    name="Category Overall"
                    stroke="#1976d2"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#1976d2' }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {/* Individual Metrics */}
                {(trendViewMode === 'metrics' || trendViewMode === 'both') &&
                  categoryData.metrics
                    .map((metric, originalIndex) => {
                      // Skip metrics that don't match the filter
                      if (trendMetricFilter && metric.id !== trendMetricFilter) {
                        return null;
                      }
                      return (
                        <Line
                          key={metric.id}
                          type="monotone"
                          dataKey={`metric_${originalIndex}`}
                          name={metric.name.length > 25 ? metric.name.substring(0, 25) + '...' : metric.name}
                          stroke={getMetricColor(originalIndex)}
                          strokeWidth={1.5}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      );
                    })
                    .filter(Boolean)
                }
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Historical trend data is simulated. Real data will be available when historical scoring is implemented.
          </Alert>
        </CardContent>
      </Card>

      {/* Section C: Actionable Insights */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LightbulbIcon color="warning" />
              Key Insights
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PsychologyIcon />}
              onClick={handleAIExplain}
            >
              AI Explain
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {insights.map((insight, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {insight.icon}
                </Typography>
                <Typography variant="body2">
                  {insight.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Section D: Metrics Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Metrics in this Category
          </Typography>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value as number | '')}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={1}>High</MenuItem>
                <MenuItem value={2}>Medium</MenuItem>
                <MenuItem value={3}>Low</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            This is a read-only dashboard view. Edit metrics in the Metrics Catalog.
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={50} />
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'name'}
                      direction={sortField === 'name' ? sortOrder : 'asc'}
                      onClick={() => handleSort('name')}
                    >
                      Metric
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortField === 'score_pct'}
                      direction={sortField === 'score_pct' ? sortOrder : 'asc'}
                      onClick={() => handleSort('score_pct')}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Current</TableCell>
                  <TableCell align="right">Target</TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortField === 'gap_to_target_pct'}
                      direction={sortField === 'gap_to_target_pct' ? sortOrder : 'asc'}
                      onClick={() => handleSort('gap_to_target_pct')}
                    >
                      Gap
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortField === 'priority_rank'}
                      direction={sortField === 'priority_rank' ? sortOrder : 'asc'}
                      onClick={() => handleSort('priority_rank')}
                    >
                      Priority
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Owner</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMetrics.map((metric) => (
                  <React.Fragment key={metric.id}>
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& > *': { borderBottom: expandedRows.has(metric.id) ? 'none' : undefined }
                      }}
                      onClick={() => toggleRowExpansion(metric.id)}
                    >
                      <TableCell>
                        <IconButton size="small">
                          {expandedRows.has(metric.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {metric.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 60,
                              height: 8,
                              backgroundColor: 'grey.200',
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${metric.score_pct || 0}%`,
                                height: '100%',
                                backgroundColor: getRiskColor(metric.score_pct || 0),
                                borderRadius: 4,
                              }}
                            />
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: getRiskColor(metric.score_pct || 0),
                              minWidth: 45,
                            }}
                          >
                            {metric.score_pct?.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {metric.current_value?.toFixed(1) ?? 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {metric.target_value?.toFixed(1) ?? 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {metric.gap_to_target_pct !== null && metric.gap_to_target_pct !== undefined && (
                            <>
                              {metric.gap_to_target_pct >= 0 ? (
                                <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                              ) : (
                                <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                              )}
                              <Typography
                                variant="body2"
                                sx={{
                                  color: metric.gap_to_target_pct >= 0 ? 'success.main' : 'error.main',
                                  fontWeight: 500,
                                }}
                              >
                                {metric.gap_to_target_pct >= 0 ? '+' : ''}{metric.gap_to_target_pct.toFixed(1)}%
                              </Typography>
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={PRIORITY_NAMES[metric.priority_rank] || 'Unknown'}
                          size="small"
                          color={
                            metric.priority_rank === 1 ? 'error' :
                            metric.priority_rank === 2 ? 'warning' : 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {metric.owner_function || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0 }}>
                        <Collapse in={expandedRows.has(metric.id)} timeout="auto" unmountOnExit>
                          <ExpandedMetricRow metric={metric} />
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
                {filteredMetrics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No metrics found matching your filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Section E: Audit Trail */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Recent Changes
            {loadingChanges && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Metric</TableCell>
                  <TableCell>Field Changed</TableCell>
                  <TableCell>Old Value</TableCell>
                  <TableCell>New Value</TableCell>
                  <TableCell>Changed By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentChanges.length > 0 ? (
                  recentChanges.map((change, index) => (
                    <TableRow key={`${change.metricId}-${change.timestamp}-${index}`} hover>
                      <TableCell>
                        <Tooltip title={new Date(change.timestamp).toLocaleString()} arrow>
                          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                            {new Date(change.timestamp).toLocaleDateString()} {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={change.metricName} arrow>
                          <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {change.metricName}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={change.fieldChanged}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {change.oldValue}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {change.newValue}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={change.changeSource} arrow>
                          <Typography variant="body2">
                            {change.changedBy}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      {loadingChanges ? (
                        <Typography variant="body2" color="text.secondary">
                          Loading audit trail...
                        </Typography>
                      ) : (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            No recent changes found for metrics in this category.
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            Version tracking captures all changes to metric values, targets, and configurations.
                          </Typography>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </ContentFrame>
  );
}

// Color palette for metric lines
const METRIC_COLORS = [
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

function getMetricColor(index: number): string {
  return METRIC_COLORS[index % METRIC_COLORS.length];
}

// Generate trend data for category and all metrics
function generateAllMetricsTrendData(
  categoryData: CategoryDetailScore,
  days: number
): Record<string, any>[] {
  const data: Record<string, any>[] = [];
  const now = new Date();
  const categoryVariance = 5;
  const metricVariance = 8;

  // Use a seeded approach based on category code for consistent mock data
  const seed = categoryData.category_code.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  for (let i = days; i >= 0; i -= Math.ceil(days / 10)) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const progress = 1 - (i / days);
    const randomFactor = Math.sin(seed + i * 0.5) * 0.5 + 0.5;

    // Category score trend
    const categoryBase = categoryData.score_pct - categoryVariance + (categoryVariance * 2 * randomFactor);
    const categoryScore = Math.max(0, Math.min(100, categoryBase + (categoryData.score_pct - categoryBase) * progress * 0.5));

    const point: Record<string, any> = {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      category: Math.round(categoryScore * 10) / 10,
    };

    // Add trend for each metric
    categoryData.metrics.forEach((metric, index) => {
      const metricScore = metric.score_pct ?? 0;
      const metricSeed = seed + metric.id.charCodeAt(0);
      const metricRandomFactor = Math.cos(metricSeed + i * 0.7) * 0.5 + 0.5;
      const metricBase = metricScore - metricVariance + (metricVariance * 2 * metricRandomFactor);
      const metricTrend = Math.max(0, Math.min(100, metricBase + (metricScore - metricBase) * progress * 0.5));
      point[`metric_${index}`] = Math.round(metricTrend * 10) / 10;
    });

    data.push(point);
  }

  // Ensure last points match current scores
  if (data.length > 0) {
    const lastPoint = data[data.length - 1];
    lastPoint.category = categoryData.score_pct;
    categoryData.metrics.forEach((metric, index) => {
      lastPoint[`metric_${index}`] = metric.score_pct ?? 0;
    });
  }

  return data;
}

interface Insight {
  icon: string;
  text: string;
}

function generateInsights(data: CategoryDetailScore): Insight[] {
  const insights: Insight[] = [];

  // Find metric with highest gap (worst performer)
  const sortedByGap = [...data.metrics]
    .filter(m => m.gap_to_target_pct !== null && m.gap_to_target_pct !== undefined)
    .sort((a, b) => (a.gap_to_target_pct ?? 0) - (b.gap_to_target_pct ?? 0));

  if (sortedByGap.length > 0 && sortedByGap[0].gap_to_target_pct! < 0) {
    insights.push({
      icon: '\u{1F534}',
      text: `Highest gap: "${sortedByGap[0].name}" at ${sortedByGap[0].gap_to_target_pct?.toFixed(0)}% below target`,
    });
  }

  // Find quick win (closest to target but still below)
  const belowTarget = sortedByGap.filter(m => m.gap_to_target_pct! < 0 && m.gap_to_target_pct! > -20);
  if (belowTarget.length > 0) {
    const quickWin = belowTarget[belowTarget.length - 1];
    insights.push({
      icon: '\u{1F3AF}',
      text: `Quick win: "${quickWin.name}" only ${Math.abs(quickWin.gap_to_target_pct!).toFixed(0)}% below target`,
    });
  }

  // Overall status
  if (data.metrics_below_target_count === data.metrics_count) {
    insights.push({
      icon: '\u26A0\uFE0F',
      text: `All ${data.metrics_count} metrics below target - this category requires immediate attention`,
    });
  } else if (data.metrics_below_target_count === 0) {
    insights.push({
      icon: '\u2705',
      text: 'All metrics are at or above target - maintain current performance',
    });
  } else {
    insights.push({
      icon: '\u{1F4CA}',
      text: `${data.metrics_below_target_count} of ${data.metrics_count} metrics below target (${((data.metrics_below_target_count / data.metrics_count) * 100).toFixed(0)}%)`,
    });
  }

  // High priority metrics below target
  const highPriorityBelowTarget = data.metrics.filter(
    m => m.priority_rank === 1 && m.gap_to_target_pct !== null && m.gap_to_target_pct !== undefined && m.gap_to_target_pct < 0
  );
  if (highPriorityBelowTarget.length > 0) {
    insights.push({
      icon: '\u{1F525}',
      text: `${highPriorityBelowTarget.length} high-priority metric${highPriorityBelowTarget.length > 1 ? 's' : ''} below target`,
    });
  }

  return insights;
}
