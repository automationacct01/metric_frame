import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Divider,
  IconButton,
  Chip,
} from '@mui/material';
import {
  CompareArrows as CompareIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { MetricVersionDiff as MetricVersionDiffType } from '../types';

interface MetricVersionDiffProps {
  metricId: string;
  versionA: number;
  versionB: number;
  open: boolean;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  formula: 'Formula',
  priority_rank: 'Priority',
  weight: 'Weight',
  direction: 'Direction',
  target_value: 'Target Value',
  target_units: 'Target Units',
  tolerance_low: 'Tolerance Low',
  tolerance_high: 'Tolerance High',
  current_value: 'Current Value',
  current_label: 'Current Label',
  owner_function: 'Owner Function',
  data_source: 'Data Source',
  collection_frequency: 'Collection Frequency',
  notes: 'Notes',
  risk_definition: 'Risk Definition',
  active: 'Active',
  metric_number: 'Metric Number',
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  return String(value);
};

const MetricVersionDiff: React.FC<MetricVersionDiffProps> = ({
  metricId,
  versionA,
  versionB,
  open,
  onClose,
}) => {
  const {
    data: diffData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['metric-version-diff', metricId, versionA, versionB],
    queryFn: () => apiClient.compareMetricVersions(metricId, versionA, versionB),
    enabled: open && !!metricId,
    staleTime: 60_000,
  });

  // Separate changed and unchanged fields
  const changedFields = diffData?.diff ? Object.keys(diffData.diff) : [];
  const allSnapshotFields = Object.keys(FIELD_LABELS);
  const unchangedFields = allSnapshotFields.filter((f) => !changedFields.includes(f));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareIcon color="primary" />
            <Typography variant="h6">
              Version Diff: v{versionA} vs v{versionB}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load version diff. Please try again.
          </Alert>
        )}

        {!isLoading && diffData && (
          <>
            {/* Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {changedFields.length} field(s) changed between version {versionA} and version{' '}
                {versionB}
              </Typography>
            </Box>

            {/* Changed Fields */}
            {changedFields.length > 0 && (
              <Paper variant="outlined" sx={{ mb: 3 }}>
                <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Changed Fields
                  </Typography>
                </Box>
                <Divider />
                {changedFields.map((field, index) => {
                  const change = diffData.diff[field];
                  return (
                    <Box key={field}>
                      {index > 0 && <Divider />}
                      <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          {FIELD_LABELS[field] || field}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                bgcolor: 'error.50',
                                borderColor: 'error.light',
                                borderLeft: '4px solid',
                                borderLeftColor: 'error.main',
                              }}
                            >
                              <Typography variant="caption" color="error.dark" display="block">
                                v{versionA} (old)
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  wordBreak: 'break-word',
                                  color: 'error.dark',
                                  fontFamily:
                                    field === 'formula' || field === 'description'
                                      ? 'monospace'
                                      : undefined,
                                }}
                              >
                                {formatValue(change.from)}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                bgcolor: 'success.50',
                                borderColor: 'success.light',
                                borderLeft: '4px solid',
                                borderLeftColor: 'success.main',
                              }}
                            >
                              <Typography variant="caption" color="success.dark" display="block">
                                v{versionB} (new)
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  wordBreak: 'break-word',
                                  color: 'success.dark',
                                  fontFamily:
                                    field === 'formula' || field === 'description'
                                      ? 'monospace'
                                      : undefined,
                                }}
                              >
                                {formatValue(change.to)}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                  );
                })}
              </Paper>
            )}

            {changedFields.length === 0 && (
              <Alert severity="info" sx={{ mb: 3 }}>
                No differences found between these two versions.
              </Alert>
            )}

            {/* Unchanged Fields */}
            {unchangedFields.length > 0 && (
              <Paper variant="outlined">
                <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Unchanged Fields ({unchangedFields.length})
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {unchangedFields.map((field) => (
                    <Chip
                      key={field}
                      label={FIELD_LABELS[field] || field}
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  ))}
                </Box>
              </Paper>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MetricVersionDiff;
