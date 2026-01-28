import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import {
  History as HistoryIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  CompareArrows as CompareIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { MetricVersionResponse } from '../types';
import MetricVersionDiff from './MetricVersionDiff';

interface MetricVersionHistoryProps {
  metricId: string;
  open: boolean;
  onClose: () => void;
}

interface ExpandableRowProps {
  version: MetricVersionResponse;
  isSelected: boolean;
  onSelectToggle: (versionNumber: number) => void;
}

const ExpandableRow: React.FC<ExpandableRowProps> = ({ version, isSelected, onSelectToggle }) => {
  const [expanded, setExpanded] = useState(false);

  const formattedDate = useMemo(() => {
    const d = new Date(version.created_at);
    return d.toLocaleString();
  }, [version.created_at]);

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& > *': { borderBottom: expanded ? 'unset' : undefined } }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={isSelected}
            onChange={() => onSelectToggle(version.version_number)}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight="bold">
            v{version.version_number}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(version.changed_fields || []).map((field: string) => (
              <Chip key={field} label={field} size="small" variant="outlined" color="primary" />
            ))}
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{version.changed_by || 'system'}</Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={version.change_source || 'api'}
            size="small"
            variant="filled"
            color={
              version.change_source === 'ai'
                ? 'secondary'
                : version.change_source === 'import'
                ? 'warning'
                : 'default'
            }
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {formattedDate}
          </Typography>
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Full Snapshot (v{version.version_number})
              </Typography>
              {version.change_notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Notes: {version.change_notes}
                </Typography>
              )}
              <Divider sx={{ mb: 1 }} />
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(version.snapshot_json, null, 2)}
                </pre>
              </Paper>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const MetricVersionHistory: React.FC<MetricVersionHistoryProps> = ({
  metricId,
  open,
  onClose,
}) => {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [diffOpen, setDiffOpen] = useState(false);

  const {
    data: versions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['metric-versions', metricId],
    queryFn: () => apiClient.getMetricVersions(metricId),
    enabled: open && !!metricId,
    staleTime: 30_000,
  });

  const handleSelectToggle = (versionNumber: number) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionNumber)) {
        return prev.filter((v) => v !== versionNumber);
      }
      // Only allow selecting up to 2 versions for comparison
      if (prev.length >= 2) {
        return [prev[1], versionNumber];
      }
      return [...prev, versionNumber];
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      setDiffOpen(true);
    }
  };

  const sortedSelected = useMemo(
    () => [...selectedVersions].sort((a, b) => a - b),
    [selectedVersions]
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h6">Version History</Typography>
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
              Failed to load version history. Please try again.
            </Alert>
          )}

          {!isLoading && !error && versions && versions.length === 0 && (
            <Alert severity="info">
              No version history available for this metric. Versions are created automatically when
              the metric is updated.
            </Alert>
          )}

          {!isLoading && versions && versions.length > 0 && (
            <>
              {selectedVersions.length === 2 && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<CompareIcon />}
                    onClick={handleCompare}
                    size="small"
                  >
                    Compare v{sortedSelected[0]} and v{sortedSelected[1]}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Select exactly 2 versions to compare
                  </Typography>
                </Box>
              )}
              {selectedVersions.length < 2 && selectedVersions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Select one more version to enable comparison
                  </Typography>
                </Box>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>Version</TableCell>
                      <TableCell>Changed Fields</TableCell>
                      <TableCell>Changed By</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {versions.map((version: MetricVersionResponse) => (
                      <ExpandableRow
                        key={version.version_number}
                        version={version}
                        isSelected={selectedVersions.includes(version.version_number)}
                        onSelectToggle={handleSelectToggle}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 2 }}>
            {versions?.length || 0} version(s) recorded
          </Typography>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Diff Dialog */}
      {diffOpen && sortedSelected.length === 2 && (
        <MetricVersionDiff
          metricId={metricId}
          versionA={sortedSelected[0]}
          versionB={sortedSelected[1]}
          open={diffOpen}
          onClose={() => setDiffOpen(false)}
        />
      )}
    </>
  );
};

export default MetricVersionHistory;
