import React, { useState, useEffect } from 'react';
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
  IconButton,
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
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';
import { RecommendationsResponse, CoverageGaps } from '../../types';

interface MetricRecommendation {
  id: string;
  name: string;
  description: string;
  suggested_function: string;
  suggested_category?: string;
  priority: number;
  rationale: string;
  data_source_suggestion?: string;
  collection_frequency?: string;
}

interface GapInfo {
  function_code: string;
  function_name: string;
  coverage_pct: number;
  metrics_count: number;
  gap_severity: 'high' | 'medium' | 'low';
  categories_missing: string[];
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
      name: recommendation.name,
      description: recommendation.description,
      direction: 'higher_is_better',
      target_value: 100,
      current_value: 0,
      unit: '%',
      priority_rank: recommendation.priority,
      owner_function: 'SecOps',
      data_source: recommendation.data_source_suggestion || '',
      collection_frequency: recommendation.collection_frequency || 'monthly',
    });
    setCreateDialogOpen(true);
  };

  const handleCreateMetric = () => {
    if (!selectedRecommendation) return;

    const metric = {
      ...newMetricForm,
      csf_function: selectedRecommendation.suggested_function,
      category_code: selectedRecommendation.suggested_category,
      active: true,
      framework_code: frameworkCode,
    };

    createMetricMutation.mutate(metric);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Medium';
    }
  };

  const getPriorityColor = (priority: number): 'error' | 'warning' | 'info' => {
    switch (priority) {
      case 1: return 'error';
      case 2: return 'warning';
      case 3: return 'info';
      default: return 'warning';
    }
  };

  const isLoading = isLoadingRecommendations || isLoadingGaps || isLoadingDistribution;
  const hasError = recommendationsError || gapsError;

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
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {hasError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error Loading Recommendations</AlertTitle>
          Failed to load AI recommendations. Please try again later.
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Analyzing your metrics and generating recommendations...
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

              {coverageGaps?.gaps && coverageGaps.gaps.length > 0 ? (
                <List>
                  {coverageGaps.gaps.slice(0, 5).map((gap: GapInfo, index: number) => (
                    <React.Fragment key={gap.function_code}>
                      <ListItem>
                        <ListItemIcon>
                          <Chip
                            size="small"
                            label={gap.gap_severity}
                            color={getSeverityColor(gap.gap_severity) as any}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={gap.function_name}
                          secondary={
                            <>
                              {gap.metrics_count} metrics ({gap.coverage_pct.toFixed(0)}% coverage)
                              {gap.categories_missing?.length > 0 && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Missing: {gap.categories_missing.slice(0, 3).join(', ')}
                                  {gap.categories_missing.length > 3 && ` +${gap.categories_missing.length - 3} more`}
                                </Typography>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      {index < Math.min(coverageGaps.gaps.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
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

              {recommendations?.summary ? (
                <Typography variant="body2" color="text.secondary" paragraph>
                  {recommendations.summary}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  AI analysis will provide insights about your metrics coverage and suggest improvements.
                </Typography>
              )}

              <Box sx={{ mt: 2 }}>
                <Chip
                  icon={<LightbulbIcon />}
                  label={`${recommendations?.recommendations?.length || 0} Recommendations`}
                  color="primary"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Chip
                  icon={<WarningIcon />}
                  label={`${coverageGaps?.gaps?.length || 0} Gaps Identified`}
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

              {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
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
                              {rec.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={getPriorityLabel(rec.priority)}
                              color={getPriorityColor(rec.priority)}
                            />
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {rec.description}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                            <Chip
                              size="small"
                              label={rec.suggested_function.toUpperCase()}
                              variant="outlined"
                            />
                            {rec.suggested_category && (
                              <Chip
                                size="small"
                                label={rec.suggested_category}
                                variant="outlined"
                              />
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
              Creating metric based on AI recommendation: <strong>{selectedRecommendation.name}</strong>
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
