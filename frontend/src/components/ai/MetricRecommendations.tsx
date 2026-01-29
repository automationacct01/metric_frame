import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AutoAwesomeIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';
import { RecommendationsResponse, CoverageGaps } from '../../types';

interface MetricRecommendation {
  id?: string;
  metric_name: string;
  description: string;
  function_code: string;
  category_code?: string;
  priority: number;
  rationale: string;
  expected_impact?: string;
}

// GapInfo types matching API response
interface FunctionGap {
  function_code: string;
  function_name: string;
  description?: string;
}

interface LowCoverageFunction {
  function_code: string;
  function_name: string;
  metric_count: number;
}

interface CategoryGap {
  category_code: string;
  category_name: string;
  category_description?: string;
  function_code: string;
  function_name: string;
}

const MetricRecommendations: React.FC = () => {
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<MetricRecommendation | null>(null);
  const [newMetricForm, setNewMetricForm] = useState({
    name: '',
    description: '',
    direction: 'higher_is_better',
    target_value: 0,
    current_value: 0,
    unit: '%',
    priority_rank: 2,
    owner_function: 'SecOps',
    data_source: '',
    collection_frequency: 'monthly',
  });

  // Fetch AI recommendations
  const {
    data: recommendations,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refetch: refetchRecommendations,
  } = useQuery<RecommendationsResponse>({
    queryKey: ['ai-recommendations', frameworkCode],
    queryFn: () => apiClient.getAIRecommendations(frameworkCode, 10),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!frameworkCode,
  });

  // Fetch coverage gaps
  const {
    data: coverageGaps,
    isLoading: isLoadingGaps,
    error: gapsError,
  } = useQuery<CoverageGaps>({
    queryKey: ['coverage-gaps', frameworkCode],
    queryFn: () => apiClient.getCoverageGaps(frameworkCode),
    staleTime: 5 * 60 * 1000,
    enabled: !!frameworkCode,
  });

  // Fetch metrics distribution
  const {
    data: distribution,
    isLoading: isLoadingDistribution,
  } = useQuery({
    queryKey: ['metrics-distribution', frameworkCode],
    queryFn: () => apiClient.getMetricsDistribution(frameworkCode),
    staleTime: 5 * 60 * 1000,
    enabled: !!frameworkCode,
  });

  // Create metric mutation
  const createMetricMutation = useMutation({
    mutationFn: (metric: any) => apiClient.createMetric(metric),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['coverage-gaps'] });
      setCreateDialogOpen(false);
      setSelectedRecommendation(null);
    },
  });

  const handleCreateFromRecommendation = (recommendation: MetricRecommendation) => {
    setSelectedRecommendation(recommendation);
    setNewMetricForm({
      name: recommendation.metric_name,
      description: recommendation.description,
      direction: 'higher_is_better',
      target_value: 100,
      current_value: 0,
      unit: '%',
      priority_rank: recommendation.priority,
      owner_function: 'SecOps',
      data_source: '',
      collection_frequency: 'monthly',
    });
    setCreateDialogOpen(true);
  };

  const handleCreateMetric = () => {
    if (!selectedRecommendation) return;

    const metric = {
      ...newMetricForm,
      csf_function: selectedRecommendation.function_code,
      category_code: selectedRecommendation.category_code,
      active: true,
      framework_code: frameworkCode,
    };

    createMetricMutation.mutate(metric);
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Medium';
    }
  };

  // Only block on coverage data loading - recommendations can load in background
  const isLoadingCoverageData = isLoadingGaps || isLoadingDistribution;
  // Critical error only if gaps fail - recommendations failing is less severe
  const hasCriticalError = gapsError;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            AI-Powered Metric Recommendations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Intelligent suggestions to improve your {selectedFramework?.name || 'framework'} coverage
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            refetchRecommendations();
          }}
          disabled={isLoadingCoverageData || isLoadingRecommendations}
        >
          Refresh
        </Button>
      </Box>

      {hasCriticalError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error Loading Coverage Data</AlertTitle>
          Failed to load coverage analysis. Please try again later.
        </Alert>
      )}

      {isLoadingCoverageData ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading coverage data...
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Coverage Overview */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Coverage Overview</Typography>
              </Box>

              {distribution && (
                <Grid container spacing={2}>
                  {Object.entries(distribution.function_distribution || {}).map(([funcCode, data]: [string, any]) => (
                    <Grid item xs={12} sm={6} md={4} key={funcCode}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            {data.function_name || funcCode.toUpperCase()}
                          </Typography>
                          <Typography variant="h4" sx={{ my: 1 }}>
                            {data.metrics_count || 0}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={data.coverage_pct || 0}
                            sx={{ height: 6, borderRadius: 3, mb: 1 }}
                            color={data.coverage_pct >= 70 ? 'success' : data.coverage_pct >= 40 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {(data.coverage_pct || 0).toFixed(0)}% coverage
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* Coverage Gaps */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Coverage Gaps</Typography>
              </Box>

              {((coverageGaps?.functions_without_metrics?.length ?? 0) > 0 ||
                (coverageGaps?.functions_with_low_coverage?.length ?? 0) > 0 ||
                (coverageGaps?.categories_without_metrics?.length ?? 0) > 0) ? (
                <Box sx={{ position: 'relative' }}>
                  <List sx={{ maxHeight: 280, overflowY: 'auto' }}>
                  {/* Functions without any metrics - high severity */}
                  {coverageGaps?.functions_without_metrics?.slice(0, 3).map((gap: FunctionGap, index: number) => (
                    <React.Fragment key={`func-${gap.function_code}`}>
                      <ListItem>
                        <ListItemIcon>
                          <Chip
                            size="small"
                            label="High"
                            variant="outlined"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={gap.function_name}
                          secondary="No metrics defined for this function"
                        />
                      </ListItem>
                      {index < (coverageGaps?.functions_without_metrics?.length ?? 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}

                  {/* Functions with low coverage - medium severity */}
                  {coverageGaps?.functions_with_low_coverage?.slice(0, 2).map((gap: LowCoverageFunction, index: number) => (
                    <React.Fragment key={`low-${gap.function_code}`}>
                      <ListItem>
                        <ListItemIcon>
                          <Chip
                            size="small"
                            label="Medium"
                            variant="outlined"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={gap.function_name}
                          secondary={`Only ${gap.metric_count} metric${gap.metric_count === 1 ? '' : 's'} defined`}
                        />
                      </ListItem>
                      {index < (coverageGaps?.functions_with_low_coverage?.length ?? 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}

                  {/* Categories without metrics - show each one */}
                  {coverageGaps?.categories_without_metrics?.map((cat: CategoryGap, index: number) => (
                    <React.Fragment key={`cat-${cat.category_code}`}>
                      <ListItem alignItems="flex-start">
                        <ListItemIcon>
                          <Chip
                            size="small"
                            label={cat.function_code.toUpperCase()}
                            color="info"
                            variant="outlined"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {cat.category_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({cat.category_code})
                              </Typography>
                            </Box>
                          }
                          secondary={
                            cat.category_description
                              ? cat.category_description
                              : `No metrics tracking ${cat.category_name.toLowerCase()} within ${cat.function_name}`
                          }
                        />
                      </ListItem>
                      {index < (coverageGaps?.categories_without_metrics?.length ?? 0) - 1 && <Divider variant="inset" />}
                    </React.Fragment>
                  ))}
                  </List>
                  {/* Scroll indicator */}
                  {(coverageGaps?.categories_without_metrics?.length ?? 0) > 3 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 40,
                        background: 'linear-gradient(transparent, rgba(255,255,255,0.95))',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', pb: 0.5 }}>
                        <KeyboardArrowDownIcon fontSize="small" />
                        <Typography variant="caption">Scroll for more</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <AlertTitle>Great Coverage!</AlertTitle>
                  No significant coverage gaps detected in your metrics.
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* AI Recommendations Summary */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PsychologyIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">AI Insights</Typography>
              </Box>

              {isLoadingRecommendations ? (
                <Typography variant="body2" color="text.secondary">
                  Generating AI insights...
                </Typography>
              ) : recommendations ? (
                <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.75 } }}>
                  {/* Coverage stat */}
                  <Typography component="li" variant="body2" color="text.secondary">
                    <strong>Coverage:</strong> {recommendations.gap_analysis?.coverage_percentage?.toFixed(0) || recommendations.current_coverage?.category_coverage_pct?.toFixed(0) || '100'}% of framework categories have metrics defined
                  </Typography>

                  {/* Underrepresented areas */}
                  {(recommendations.gap_analysis?.underrepresented_functions?.length ?? 0) > 0 && (
                    <Typography component="li" variant="body2" color="text.secondary">
                      <strong>Gaps identified:</strong> {recommendations.gap_analysis?.underrepresented_functions?.join(', ')} need additional metrics
                    </Typography>
                  )}

                  {/* Key insight from top recommendation */}
                  {recommendations.recommendations?.length > 0 && recommendations.recommendations[0]?.rationale && (
                    <Typography component="li" variant="body2" color="text.secondary">
                      <strong>Key finding:</strong> {(() => {
                        const text = recommendations.recommendations[0].rationale;
                        // Split on period followed by space (avoids breaking on "ID.IM")
                        const match = text.match(/^(.+?\.)\s/);
                        return match ? match[1] : (text.length > 150 ? text.slice(0, 150) + '...' : text);
                      })()}
                    </Typography>
                  )}

                  {/* Impact/why it matters from expected_impact */}
                  {recommendations.recommendations?.length > 0 && recommendations.recommendations[0]?.expected_impact && (
                    <Typography component="li" variant="body2" color="text.secondary">
                      <strong>Impact:</strong> {(() => {
                        const text = recommendations.recommendations[0].expected_impact;
                        const match = text.match(/^(.+?\.)\s/);
                        return match ? match[1] : (text.length > 150 ? text.slice(0, 150) + '...' : text);
                      })()}
                    </Typography>
                  )}

                  {/* Recommendation summary */}
                  {recommendations.recommendations?.length > 0 ? (
                    <Typography component="li" variant="body2" color="text.secondary">
                      <strong>Suggested actions:</strong> {recommendations.recommendations.filter(r => r.priority === 1).length} high priority, {recommendations.recommendations.filter(r => r.priority === 2).length} medium priority metrics to consider
                    </Typography>
                  ) : (
                    <Typography component="li" variant="body2" color="success.main">
                      <strong>Status:</strong> Excellent program maturity - no gaps identified
                    </Typography>
                  )}
                </Box>
              ) : recommendationsError ? (
                <Typography variant="body2" color="text.secondary">
                  AI insights unavailable. View coverage gaps below.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  AI analysis will provide insights about your metrics coverage.
                </Typography>
              )}

              <Box sx={{ mt: 2 }}>
                <Chip
                  icon={<LightbulbIcon />}
                  label={isLoadingRecommendations ? 'Loading...' : `${recommendations?.recommendations?.length || 0} Recommendations`}
                  color="primary"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Chip
                  icon={<WarningIcon />}
                  label={`${coverageGaps?.total_gap_count || 0} Gaps Identified`}
                  color="warning"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Grid>

          {/* Detailed Recommendations */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Recommended Metrics</Typography>
              </Box>

              {isLoadingRecommendations ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    AI is generating metric recommendations... This may take up to 90 seconds.
                  </Typography>
                </Box>
              ) : recommendationsError ? (
                <Alert
                  severity="warning"
                  action={
                    <Button color="inherit" size="small" onClick={() => refetchRecommendations()}>
                      Retry
                    </Button>
                  }
                >
                  <AlertTitle>Recommendations Unavailable</AlertTitle>
                  AI recommendations timed out or encountered an error. Coverage data above is still available.
                </Alert>
              ) : recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
                <Grid container spacing={2}>
                  {recommendations.recommendations.map((rec: MetricRecommendation, index: number) => (
                    <Grid item xs={12} md={6} lg={4} key={rec.id || index}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                          },
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {rec.metric_name}
                            </Typography>
                            <Tooltip title="Implementation priority (High = address first)" arrow>
                              <Chip
                                size="small"
                                label={getPriorityLabel(rec.priority)}
                                variant="outlined"
                              />
                            </Tooltip>
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {rec.description}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                            <Tooltip title="Framework function this metric maps to" arrow>
                              <Chip
                                size="small"
                                label={rec.function_code.toUpperCase()}
                                variant="outlined"
                              />
                            </Tooltip>
                            {rec.category_code && (
                              <Tooltip title="Framework category within the function" arrow>
                                <Chip
                                  size="small"
                                  label={rec.category_code}
                                  variant="outlined"
                                />
                              </Tooltip>
                            )}
                          </Box>

                          <Accordion elevation={0} sx={{ bgcolor: 'grey.50' }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="caption" fontWeight="medium">
                                Why this metric?
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography variant="body2" color="text.secondary">
                                {rec.rationale}
                              </Typography>
                            </AccordionDetails>
                          </Accordion>
                        </CardContent>

                        <CardActions>
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleCreateFromRecommendation(rec)}
                            fullWidth
                            variant="contained"
                          >
                            Create Metric
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  <AlertTitle>No Recommendations</AlertTitle>
                  AI recommendations will appear here once the analysis is complete.
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Create Metric Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create Metric from Recommendation
        </DialogTitle>
        <DialogContent>
          {selectedRecommendation && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Creating metric based on AI recommendation: <strong>{selectedRecommendation.metric_name}</strong>
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Metric Name"
                value={newMetricForm.name}
                onChange={(e) => setNewMetricForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newMetricForm.description}
                onChange={(e) => setNewMetricForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Target Value"
                value={newMetricForm.target_value}
                onChange={(e) => setNewMetricForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Current Value"
                value={newMetricForm.current_value}
                onChange={(e) => setNewMetricForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Direction</InputLabel>
                <Select
                  value={newMetricForm.direction}
                  label="Direction"
                  onChange={(e) => setNewMetricForm(prev => ({ ...prev, direction: e.target.value }))}
                >
                  <MenuItem value="higher_is_better">Higher is Better</MenuItem>
                  <MenuItem value="lower_is_better">Lower is Better</MenuItem>
                  <MenuItem value="target_range">Target Range</MenuItem>
                  <MenuItem value="binary">Binary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Unit"
                value={newMetricForm.unit}
                onChange={(e) => setNewMetricForm(prev => ({ ...prev, unit: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newMetricForm.priority_rank}
                  label="Priority"
                  onChange={(e) => setNewMetricForm(prev => ({ ...prev, priority_rank: e.target.value as number }))}
                >
                  <MenuItem value={1}>High</MenuItem>
                  <MenuItem value={2}>Medium</MenuItem>
                  <MenuItem value={3}>Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Owner Function</InputLabel>
                <Select
                  value={newMetricForm.owner_function}
                  label="Owner Function"
                  onChange={(e) => setNewMetricForm(prev => ({ ...prev, owner_function: e.target.value }))}
                >
                  <MenuItem value="GRC">GRC</MenuItem>
                  <MenuItem value="SecOps">SecOps</MenuItem>
                  <MenuItem value="IAM">IAM</MenuItem>
                  <MenuItem value="IT Ops">IT Ops</MenuItem>
                  <MenuItem value="IR">IR</MenuItem>
                  <MenuItem value="BCP">BCP</MenuItem>
                  <MenuItem value="CISO">CISO</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Data Source"
                value={newMetricForm.data_source}
                onChange={(e) => setNewMetricForm(prev => ({ ...prev, data_source: e.target.value }))}
                placeholder="e.g., SIEM, Vulnerability Scanner, EDR"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Collection Frequency</InputLabel>
                <Select
                  value={newMetricForm.collection_frequency}
                  label="Collection Frequency"
                  onChange={(e) => setNewMetricForm(prev => ({ ...prev, collection_frequency: e.target.value }))}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="ad_hoc">Ad Hoc</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateMetric}
            disabled={createMetricMutation.isPending || !newMetricForm.name}
            startIcon={createMetricMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Create Metric
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MetricRecommendations;
