import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info as InfoIcon,
} from '@mui/icons-material';

import { 
  FunctionScore, 
  CSF_FUNCTION_NAMES, 
  CSF_FUNCTION_DESCRIPTIONS, 
  RISK_RATING_COLORS 
} from '../types';

interface ScoreCardProps {
  functionScore: FunctionScore;
  onClick?: () => void;
  showTrend?: boolean;
  trend?: number; // Percentage change from previous period
}

export default function ScoreCard({ 
  functionScore, 
  onClick, 
  showTrend = false, 
  trend 
}: ScoreCardProps) {
  const { function: csfFunction, score_pct, risk_rating, metrics_count, metrics_below_target_count } = functionScore;
  
  const functionName = CSF_FUNCTION_NAMES[csfFunction];
  const functionDescription = CSF_FUNCTION_DESCRIPTIONS[csfFunction];
  const riskColor = RISK_RATING_COLORS[risk_rating];
  
  const metricsAtTarget = metrics_count - metrics_below_target_count;
  const atTargetPercentage = metrics_count > 0 ? (metricsAtTarget / metrics_count) * 100 : 0;

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        } : {},
        border: `2px solid ${riskColor}20`,
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
              {functionName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {functionDescription}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showTrend && trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {trend > 0 ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                ) : trend < 0 ? (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                ) : null}
                <Typography variant="caption" color={trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary'}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </Typography>
              </Box>
            )}
            
            <Tooltip title={`Risk Level: ${risk_rating.toUpperCase()}`}>
              <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Tooltip>
          </Box>
        </Box>

        {/* Score Display */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
            <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: riskColor }}>
              {score_pct.toFixed(1)}%
            </Typography>
            
            <Chip
              label={risk_rating.toUpperCase()}
              size="small"
              sx={{
                backgroundColor: `${riskColor}20`,
                color: riskColor,
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={score_pct}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: riskColor,
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Metrics Summary */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {metrics_count} metrics
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {metricsAtTarget} at target ({atTargetPercentage.toFixed(0)}%)
            </Typography>
          </Box>
          
          {metrics_below_target_count > 0 && (
            <Chip
              label={`${metrics_below_target_count} below target`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}