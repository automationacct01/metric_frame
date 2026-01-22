import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  NewReleases as NewReleasesIcon,
  Update as UpdateIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';
import { formatDistanceToNow } from 'date-fns';

interface ChangeHighlightProps {
  limit?: number;
  showOnlySignificant?: boolean;
}

interface MetricChange {
  id: string;
  metric_number: string;
  name: string;
  csf_function: string;
  previous_value: number | null;
  current_value: number;
  change_pct: number;
  change_direction: 'improved' | 'declined' | 'new' | 'unchanged';
  updated_at: string;
  is_significant: boolean;
}

const ChangeHighlight: React.FC<ChangeHighlightProps> = ({
  limit = 10,
  showOnlySignificant = false,
}) => {
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  // Fetch recent metrics with changes
  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['metrics-recent-changes', frameworkCode, limit],
    queryFn: async () => {
      const response = await apiClient.getMetrics({
        framework: frameworkCode,
        limit: limit * 2, // Fetch more to filter
        offset: 0,
      });
      return response.items;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!frameworkCode,
  });

  // Process metrics to find changes (simulated for now as we'd need historical data)
  const processedChanges: MetricChange[] = React.useMemo(() => {
    if (!metrics) return [];

    return metrics
      .map((metric: any) => {
        // Calculate change from target (simulating period comparison)
        const targetDiff = metric.target_value
          ? ((metric.current_value - metric.target_value) / metric.target_value) * 100
          : 0;

        const isImproved = metric.direction === 'higher_is_better'
          ? metric.current_value >= (metric.target_value || 0)
          : metric.current_value <= (metric.target_value || 0);

        return {
          id: metric.id,
          metric_number: metric.metric_number || 'N/A',
          name: metric.name,
          csf_function: metric.csf_function,
          previous_value: metric.target_value,
          current_value: metric.current_value,
          change_pct: targetDiff,
          change_direction: isImproved ? 'improved' : 'declined',
          updated_at: metric.updated_at,
          is_significant: Math.abs(targetDiff) > 10,
        } as MetricChange;
      })
      .filter((change: MetricChange) => !showOnlySignificant || change.is_significant)
      .sort((a: MetricChange, b: MetricChange) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
      .slice(0, limit);
  }, [metrics, showOnlySignificant, limit]);

  const getChangeIcon = (direction: string) => {
    switch (direction) {
      case 'improved':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'declined':
        return <WarningIcon sx={{ color: 'error.main' }} />;
      case 'new':
        return <NewReleasesIcon sx={{ color: 'info.main' }} />;
      default:
        return <UpdateIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  const getChangeColor = (direction: string): 'success' | 'error' | 'info' | 'default' => {
    switch (direction) {
      case 'improved': return 'success';
      case 'declined': return 'error';
      case 'new': return 'info';
      default: return 'default';
    }
  };

  const getFunctionColor = (func: string): string => {
    const colors: Record<string, string> = {
      gv: '#9c27b0',
      id: '#2196f3',
      pr: '#4caf50',
      de: '#ff9800',
      rs: '#f44336',
      rc: '#00bcd4',
    };
    return colors[func?.toLowerCase()] || '#666';
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        Failed to load metric changes.
      </Alert>
    );
  }

  // Separate improved and declined
  const improved = processedChanges.filter(c => c.change_direction === 'improved');
  const declined = processedChanges.filter(c => c.change_direction === 'declined');

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUpIcon sx={{ color: 'success.main' }} />
                <Typography variant="subtitle2" color="success.main">
                  Improved Metrics
                </Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {improved.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Meeting or exceeding targets
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingDownIcon sx={{ color: 'error.main' }} />
                <Typography variant="subtitle2" color="error.main">
                  Needs Attention
                </Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                {declined.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Below target values
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change List */}
      {processedChanges.length > 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UpdateIcon color="primary" />
            Recent Metric Status
          </Typography>

          <List>
            {processedChanges.map((change, index) => (
              <React.Fragment key={change.id}>
                <ListItem
                  sx={{
                    py: 1.5,
                    px: 2,
                    bgcolor: change.change_direction === 'declined' ? 'error.50' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemIcon>
                    {getChangeIcon(change.change_direction)}
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={change.metric_number}
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            height: 20,
                          }}
                        />
                        <Typography variant="body2" fontWeight="medium">
                          {change.name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={change.csf_function?.toUpperCase()}
                          sx={{
                            bgcolor: `${getFunctionColor(change.csf_function)}20`,
                            color: getFunctionColor(change.csf_function),
                            fontSize: '0.65rem',
                            height: 18,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          <ScheduleIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                          {formatTimeAgo(change.updated_at)}
                        </Typography>
                      </Box>
                    }
                  />

                  <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      {change.change_direction === 'improved' ? (
                        <ArrowUpwardIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      ) : change.change_direction === 'declined' ? (
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: 'error.main' }} />
                      ) : null}
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={change.change_direction === 'improved' ? 'success.main' : 'error.main'}
                      >
                        {change.current_value?.toFixed(1)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Target: {change.previous_value?.toFixed(1) || 'N/A'}
                    </Typography>
                  </Box>
                </ListItem>
                {index < processedChanges.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Alert severity="info">
          <AlertTitle>No Recent Changes</AlertTitle>
          No significant metric changes detected in the recent period.
        </Alert>
      )}
    </Box>
  );
};

export default ChangeHighlight;
