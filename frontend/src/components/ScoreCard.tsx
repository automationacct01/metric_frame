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
import { useNavigate } from 'react-router-dom';

import {
  FunctionScore,
  CSF_FUNCTION_NAMES,
  CSF_FUNCTION_DESCRIPTIONS,
  RISK_RATING_COLORS,
  RiskRating,
} from '../types';

// Standard risk color lookup that handles string risk ratings
const getRiskColor = (riskRating: string | RiskRating): string => {
  // Normalize to lowercase for comparison
  const normalized = riskRating.toLowerCase().replace(' ', '_');

  // Map to standard colors
  switch (normalized) {
    case 'very_low':
    case 'verylow':
      return '#2e7d32';  // Dark Green
    case 'low':
      return '#66bb6a';  // Light Green
    case 'medium':
    case 'moderate':
      return '#ff9800';  // Orange
    case 'high':
    case 'elevated':
      return '#f44336';  // Red
    case 'very_high':
    case 'veryhigh':
    case 'critical':
      return '#d32f2f';  // Dark Red
    default:
      // Try to use the enum-based lookup as fallback
      return RISK_RATING_COLORS[riskRating as RiskRating] || '#9e9e9e';
  }
};

const formatRiskRating = (riskRating: string): string => {
  return riskRating.replace('_', ' ').toUpperCase();
};

interface ScoreCardProps {
  functionScore: FunctionScore;
  onClick?: () => void;
  showTrend?: boolean;
  trend?: number; // Percentage change from previous period
  // Multi-framework support - optional overrides
  functionName?: string;
  functionDescription?: string;
  colorHex?: string;
}

export default function ScoreCard({
  functionScore,
  onClick,
  showTrend = false,
  trend,
  functionName: overrideFunctionName,
  functionDescription: overrideFunctionDescription,
  colorHex,
}: ScoreCardProps) {
  const navigate = useNavigate();
  const { function: csfFunction, score_pct, risk_rating, metrics_count, metrics_below_target_count } = functionScore;

  // Use override names if provided, otherwise fall back to CSF defaults
  const functionName = overrideFunctionName || CSF_FUNCTION_NAMES[csfFunction] || csfFunction;
  const functionDescription = overrideFunctionDescription || CSF_FUNCTION_DESCRIPTIONS[csfFunction] || '';

  // Always use standardized risk-based colors for score and risk badge
  const riskColor = getRiskColor(risk_rating);
  // Use function color for card decoration only, fallback to risk color
  const decorativeColor = colorHex || riskColor;
  
  const metricsAtTarget = metrics_count - metrics_below_target_count;
  const atTargetPercentage = metrics_count > 0 ? (metricsAtTarget / metrics_count) * 100 : 0;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navigate to function detail page
      navigate(`/app/functions/${csfFunction}`);
    }
  };

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        border: `2px solid ${decorativeColor}20`,
      }}
      onClick={handleClick}
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
            
            <Tooltip title={`Risk Level: ${formatRiskRating(risk_rating)}`}>
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
              label={formatRiskRating(risk_rating)}
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