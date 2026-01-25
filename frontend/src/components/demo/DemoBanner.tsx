/**
 * Demo Banner Component
 *
 * Persistent banner shown at the top of the app when in demo mode.
 * Displays:
 * - Demo mode indicator
 * - Time remaining
 * - AI metrics quota
 * - Upgrade CTA
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Timer as TimerIcon,
  AutoAwesome as AIIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material';
import { useDemo } from '../../contexts/DemoContext';

interface DemoBannerProps {
  showQuota?: boolean;
  framework?: 'csf_2_0' | 'ai_rmf';
}

export default function DemoBanner({ showQuota = true, framework }: DemoBannerProps) {
  const theme = useTheme();
  const {
    isDemo,
    isDemoStarted,
    timeRemaining,
    quotas,
    canCreateCsfMetric,
    canCreateAiRmfMetric,
  } = useDemo();

  // Don't render if not in demo mode
  if (!isDemo || !isDemoStarted) {
    return null;
  }

  // Calculate quota for current framework
  const currentQuota = framework === 'ai_rmf'
    ? { created: quotas.ai_rmf_metrics_created, max: quotas.ai_rmf_metrics_max }
    : { created: quotas.csf_metrics_created, max: quotas.csf_metrics_max };

  const quotaProgress = (currentQuota.created / currentQuota.max) * 100;
  const canCreate = framework === 'ai_rmf' ? canCreateAiRmfMetric : canCreateCsfMetric;

  return (
    <Box
      sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.main',
        color: 'primary.contrastText',
        py: 0.75,
        px: 2,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      {/* Left: Demo Mode Label */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label="DEMO MODE"
          size="small"
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        />
        {timeRemaining && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TimerIcon fontSize="small" />
            <Typography variant="body2">
              {timeRemaining}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Center: AI Quota (optional) */}
      {showQuota && framework && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, maxWidth: 300 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AIIcon fontSize="small" />
            <Typography variant="body2">
              AI Metrics: {currentQuota.created}/{currentQuota.max}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={quotaProgress}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.3)',
              '& .MuiLinearProgress-bar': {
                bgcolor: canCreate ? 'rgba(255, 255, 255, 0.9)' : 'warning.main',
              },
            }}
          />
        </Box>
      )}

      {/* Right: Upgrade CTA */}
      <Button
        variant="contained"
        size="small"
        startIcon={<UpgradeIcon />}
        sx={{
          bgcolor: 'white',
          color: 'primary.main',
          '&:hover': {
            bgcolor: 'grey.100',
          },
        }}
        onClick={() => {
          // TODO: Navigate to pricing/signup page
          window.location.href = '/#pricing';
        }}
      >
        Get Full Access
      </Button>
    </Box>
  );
}
