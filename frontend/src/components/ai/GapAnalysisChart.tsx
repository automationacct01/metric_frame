import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  CircularProgress,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  RadioButtonUnchecked as EmptyIcon,
  Lens as FilledIcon,
  Category as CategoryIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';

interface GapAnalysisChartProps {
  showRadar?: boolean;
  showBar?: boolean;
  height?: number;
}

interface CategoryData {
  category_code: string;
  category_name: string;
  metric_count: number;
}

interface FunctionWithCategories {
  function_code: string;
  function_name: string;
  metric_count: number;
  categories: CategoryData[];
}

interface ChartDataItem {
  name: string;
  code: string;
  coverage: number;
  metrics: number;
  fullMark: number;
  color: string;
  categories: CategoryData[];
  categoriesWithMetrics: number;
  totalCategories: number;
}

// Default colors for CSF functions
const FUNCTION_COLORS: Record<string, string> = {
  gv: '#9c27b0',  // Purple - Govern
  id: '#2196f3',  // Blue - Identify
  pr: '#4caf50',  // Green - Protect
  de: '#ff9800',  // Orange - Detect
  rs: '#f44336',  // Red - Respond
  rc: '#00bcd4',  // Teal - Recover
  // AI RMF functions
  govern: '#9c27b0',
  map: '#2196f3',
  measure: '#4caf50',
  manage: '#ff9800',
};

// Category insights with risk descriptions, business impact, and example metrics
interface CategoryInsight {
  riskDescription: string;
  businessImpact: string;
  exampleMetrics: string[];
}

const CATEGORY_INSIGHTS: Record<string, CategoryInsight> = {
  // GOVERN categories
  'GV.OC': {
    riskDescription: 'Without organizational context metrics, security investments may not align with business objectives and legal requirements.',
    businessImpact: 'Misaligned security spending, potential regulatory non-compliance, inability to demonstrate due diligence to stakeholders.',
    exampleMetrics: ['Percent of business units with documented risk appetite', 'Number of regulatory requirements mapped to controls', 'Frequency of security strategy reviews'],
  },
  'GV.RM': {
    riskDescription: 'Lacking risk management strategy metrics means no visibility into whether risk decisions are being made consistently.',
    businessImpact: 'Inconsistent risk acceptance, potential for unmitigated high-impact risks, audit findings, and board-level accountability gaps.',
    exampleMetrics: ['Percent of risks with documented treatment plans', 'Average time to risk decision', 'Number of risk exceptions pending review'],
  },
  'GV.RR': {
    riskDescription: 'Without roles and responsibilities metrics, accountability gaps lead to security tasks falling through the cracks.',
    businessImpact: 'Unclear ownership during incidents, delayed response, finger-pointing, and potential negligence claims.',
    exampleMetrics: ['Percent of critical systems with assigned security owners', 'Number of RACI gaps in security processes', 'Time since last responsibility review'],
  },
  'GV.PO': {
    riskDescription: 'Missing policy metrics means you cannot verify if security policies are current, communicated, or followed.',
    businessImpact: 'Outdated policies, non-compliance with regulations, inconsistent security practices across the organization.',
    exampleMetrics: ['Percent of policies reviewed in last 12 months', 'Policy acknowledgment completion rate', 'Number of policy exceptions'],
  },
  'GV.OV': {
    riskDescription: 'Without oversight metrics, leadership cannot verify that security programs are effective or adequately resourced.',
    businessImpact: 'Insufficient security investment, missed strategic risks, board and executive blind spots.',
    exampleMetrics: ['Frequency of security briefings to leadership', 'Percent of security KPIs reviewed by executives', 'Security budget variance'],
  },
  'GV.SC': {
    riskDescription: 'Supply chain risk management gaps mean third-party risks could compromise your organization without warning.',
    businessImpact: 'Vendor breaches impacting your data, regulatory fines for third-party failures, reputational damage from supplier incidents.',
    exampleMetrics: ['Percent of critical vendors with security assessments', 'Average vendor security score', 'Number of vendors with incident notification clauses'],
  },
  // IDENTIFY categories
  'ID.AM': {
    riskDescription: 'Asset management gaps mean you cannot protect what you do not know exists. Shadow IT and unknown assets are primary attack vectors.',
    businessImpact: 'Unpatched systems, data breaches through unknown assets, compliance failures, wasted security spending on wrong areas.',
    exampleMetrics: ['Percent of assets in inventory vs discovered', 'Average time to onboard new asset to inventory', 'Number of orphaned/unowned assets'],
  },
  'ID.RA': {
    riskDescription: 'Without risk assessment metrics, threats and vulnerabilities are identified ad-hoc rather than systematically.',
    businessImpact: 'Reactive rather than proactive security, missed vulnerabilities, inefficient resource allocation, audit findings.',
    exampleMetrics: ['Percent of systems with current risk assessments', 'Average risk assessment age', 'Number of high-risk findings unaddressed'],
  },
  'ID.IM': {
    riskDescription: 'Improvement metrics track whether your security program is getting better or stagnating over time.',
    businessImpact: 'Security program stagnation, repeated incidents, inability to demonstrate progress to leadership, talent retention issues.',
    exampleMetrics: ['Number of improvement initiatives completed', 'Percent reduction in recurring findings', 'Security maturity score trend'],
  },
  // PROTECT categories
  'PR.AA': {
    riskDescription: 'Identity and access management gaps are among the most exploited attack vectors. Unauthorized access leads directly to breaches.',
    businessImpact: 'Account takeover, privilege escalation, insider threats, regulatory fines for access control failures.',
    exampleMetrics: ['Percent of accounts with MFA enabled', 'Number of privileged accounts', 'Average time to revoke terminated user access'],
  },
  'PR.AT': {
    riskDescription: 'Without awareness training metrics, employees remain the weakest link, susceptible to phishing and social engineering.',
    businessImpact: 'Successful phishing attacks, data loss through human error, compliance violations, increased incident frequency.',
    exampleMetrics: ['Percent of employees completing security training', 'Phishing simulation click rate', 'Average time since last security awareness activity'],
  },
  'PR.DS': {
    riskDescription: 'Data security gaps mean sensitive information may be exposed, unencrypted, or improperly handled.',
    businessImpact: 'Data breaches, regulatory fines (GDPR, CCPA), intellectual property theft, customer trust erosion.',
    exampleMetrics: ['Percent of sensitive data encrypted at rest', 'Number of DLP policy violations', 'Data classification coverage'],
  },
  'PR.PS': {
    riskDescription: 'Platform security metrics ensure your infrastructure foundations are hardened against attack.',
    businessImpact: 'System compromises, lateral movement by attackers, failed compliance audits, extended breach dwell time.',
    exampleMetrics: ['Percent of systems meeting baseline hardening', 'Number of critical patches pending', 'Average patch deployment time'],
  },
  'PR.IR': {
    riskDescription: 'Technology infrastructure resilience gaps mean single points of failure could cause extended outages.',
    businessImpact: 'Extended downtime, data loss, recovery costs, SLA violations, customer churn.',
    exampleMetrics: ['Percent of critical systems with redundancy', 'Average backup success rate', 'RTO/RPO achievement rate'],
  },
  // DETECT categories
  'DE.CM': {
    riskDescription: 'Continuous monitoring gaps mean attacks can go undetected for extended periods, increasing damage.',
    businessImpact: 'Extended breach dwell time, larger data exfiltration, higher remediation costs, regulatory reporting failures.',
    exampleMetrics: ['Percent of assets with security monitoring', 'Mean time to detect (MTTD)', 'Number of blind spots in monitoring coverage'],
  },
  'DE.AE': {
    riskDescription: 'Without adverse event analysis, detected events are not properly investigated or correlated.',
    businessImpact: 'Missed attack patterns, alert fatigue, false negatives, inability to learn from security events.',
    exampleMetrics: ['Percent of alerts triaged within SLA', 'False positive rate', 'Number of correlated incidents identified'],
  },
  // RESPOND categories
  'RS.MA': {
    riskDescription: 'Incident management gaps mean when breaches occur, response is chaotic and ineffective.',
    businessImpact: 'Extended incident duration, increased damage, regulatory notification failures, reputational harm.',
    exampleMetrics: ['Mean time to respond (MTTR)', 'Percent of incidents following runbooks', 'Incident escalation timeliness'],
  },
  'RS.AN': {
    riskDescription: 'Without incident analysis metrics, you cannot determine root cause or prevent recurrence.',
    businessImpact: 'Recurring incidents, unknown attack scope, incomplete remediation, continued vulnerability.',
    exampleMetrics: ['Percent of incidents with root cause analysis', 'Average time to determine impact scope', 'Number of incidents with forensic analysis'],
  },
  'RS.CO': {
    riskDescription: 'Incident communication gaps lead to stakeholder confusion, delayed notifications, and legal exposure.',
    businessImpact: 'Regulatory notification failures, stakeholder trust erosion, legal liability, brand damage.',
    exampleMetrics: ['Average time to notify stakeholders', 'Percent of incidents with external communication', 'Communication plan test frequency'],
  },
  'RS.MI': {
    riskDescription: 'Mitigation metrics ensure incidents are actually contained and eradicated, not just acknowledged.',
    businessImpact: 'Incomplete containment, attacker persistence, reinfection, extended business disruption.',
    exampleMetrics: ['Average time to containment', 'Percent of incidents fully remediated', 'Number of incidents requiring re-remediation'],
  },
  // RECOVER categories
  'RC.RP': {
    riskDescription: 'Recovery planning gaps mean you may not be able to restore operations after a major incident.',
    businessImpact: 'Extended outages, data loss, business interruption costs, potential business failure.',
    exampleMetrics: ['Percent of critical systems with recovery plans', 'Recovery plan test frequency', 'Average recovery time achieved vs planned'],
  },
  'RC.CO': {
    riskDescription: 'Recovery communication gaps leave stakeholders uncertain about restoration status and timelines.',
    businessImpact: 'Customer churn during outages, partner relationship damage, stock price impact, regulatory scrutiny.',
    exampleMetrics: ['Average time to first recovery status update', 'Stakeholder satisfaction with recovery communication', 'Number of recovery updates provided per incident'],
  },
  'RC.IM': {
    riskDescription: 'Without recovery improvement metrics, the same recovery failures will repeat in future incidents.',
    businessImpact: 'Recurring recovery failures, increasing recovery times, inability to meet resilience commitments.',
    exampleMetrics: ['Number of recovery lessons learned implemented', 'Recovery time improvement trend', 'Percent of post-incident recommendations completed'],
  },
  // AI-specific categories
  'GV.AI-OC': {
    riskDescription: 'AI organizational context gaps mean AI systems may not align with enterprise risk tolerance and values.',
    businessImpact: 'AI decisions conflicting with business ethics, regulatory violations, reputational harm from AI failures.',
    exampleMetrics: ['Percent of AI systems with documented use cases', 'Number of AI ethics reviews completed', 'AI risk appetite alignment score'],
  },
  'GV.AI-RM': {
    riskDescription: 'AI risk management gaps leave AI-specific threats like model manipulation and bias unaddressed.',
    businessImpact: 'Biased AI decisions, adversarial attacks on models, regulatory fines, discrimination lawsuits.',
    exampleMetrics: ['Percent of AI models with risk assessments', 'Number of AI-specific risks in risk register', 'AI model audit frequency'],
  },
  'GV.AI-PO': {
    riskDescription: 'Without AI policy metrics, AI development and deployment may violate emerging regulations.',
    businessImpact: 'Non-compliance with AI Act and similar regulations, inconsistent AI practices, liability exposure.',
    exampleMetrics: ['Percent of AI projects with policy compliance review', 'Number of AI policies in place', 'AI policy exception rate'],
  },
  'ID.AI-AM': {
    riskDescription: 'AI asset management gaps mean you may not know what AI systems exist or their risk profiles.',
    businessImpact: 'Shadow AI, uncontrolled model deployments, inability to respond to AI-specific incidents.',
    exampleMetrics: ['Percent of AI models in inventory', 'Number of AI systems with assigned owners', 'AI asset discovery coverage'],
  },
  'ID.AI-RA': {
    riskDescription: 'AI risk assessment gaps leave AI-specific vulnerabilities like data poisoning unidentified.',
    businessImpact: 'Exploited AI models, incorrect AI outputs affecting business decisions, compliance failures.',
    exampleMetrics: ['Percent of AI models with current risk assessments', 'Number of AI-specific threats assessed', 'AI risk assessment coverage'],
  },
  'ID.AI-VL': {
    riskDescription: 'AI vulnerability management gaps mean AI-specific weaknesses are not systematically identified.',
    businessImpact: 'Adversarial attacks succeeding, model drift going undetected, AI system failures.',
    exampleMetrics: ['Number of AI vulnerabilities identified', 'AI model robustness testing frequency', 'Percent of AI models tested for adversarial inputs'],
  },
};

// Get category insight with fallback for unknown categories
const getCategoryInsight = (categoryCode: string): CategoryInsight => {
  return CATEGORY_INSIGHTS[categoryCode] || {
    riskDescription: 'This category represents an important area of the security framework that requires monitoring to ensure comprehensive coverage.',
    businessImpact: 'Gaps in this area may lead to undetected risks, compliance issues, or security blind spots.',
    exampleMetrics: ['Coverage percentage for this category', 'Number of controls implemented', 'Time since last assessment'],
  };
};

const GapAnalysisChart: React.FC<GapAnalysisChartProps> = ({
  showRadar = true,
  showBar = true,
  height = 300,
}) => {
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});
  const [creatingMetrics, setCreatingMetrics] = useState<Record<string, boolean>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const toggleFunction = (code: string) => {
    setExpandedFunctions(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleAddMetric = async (metricName: string, categoryCode: string) => {
    const key = `${categoryCode}-${metricName}`;
    setCreatingMetrics(prev => ({ ...prev, [key]: true }));

    try {
      const result = await apiClient.generateMetricFromName(metricName, frameworkCode);

      if (result.success && result.metric) {
        // Get business impact from category insights
        const insight = getCategoryInsight(categoryCode);

        // Create the metric with business_impact included
        await apiClient.createMetric({
          ...result.metric,
          category_code: categoryCode,
          business_impact: insight.businessImpact,
        } as any);

        setSnackbar({
          open: true,
          message: `Metric "${metricName}" created successfully!`,
          severity: 'success',
        });
      } else {
        throw new Error(result.error || 'Failed to generate metric');
      }
    } catch (error) {
      console.error('Error creating metric:', error);
      setSnackbar({
        open: true,
        message: `Failed to create metric: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setCreatingMetrics(prev => ({ ...prev, [key]: false }));
    }
  };

  // Fetch metrics distribution
  const {
    data: distribution,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['metrics-distribution', frameworkCode],
    queryFn: () => apiClient.getMetricsDistribution(frameworkCode),
    staleTime: 5 * 60 * 1000,
    enabled: !!frameworkCode,
  });

  // Expand all functions by default when data loads
  useEffect(() => {
    if (distribution?.functions) {
      const expanded: Record<string, boolean> = {};
      distribution.functions.forEach((func: FunctionWithCategories) => {
        expanded[func.function_code] = true;
      });
      setExpandedFunctions(expanded);
    }
  }, [distribution]);

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
        Failed to load gap analysis data.
      </Alert>
    );
  }

  // Transform data for charts - handle both 'functions' array and 'function_distribution' object formats
  const chartData: ChartDataItem[] = (distribution?.functions || []).map((func: FunctionWithCategories) => {
    // Calculate total metrics from categories if function-level count is 0
    const categories = func.categories || [];
    const categoryMetrics = categories.reduce((sum: number, cat: CategoryData) => sum + (cat.metric_count || 0), 0);
    const metricsCount = func.metric_count || categoryMetrics;

    // Calculate coverage based on categories having metrics
    const totalCategories = categories.length || 1;
    const categoriesWithMetrics = categories.filter((c: CategoryData) => c.metric_count > 0).length || 0;
    const coverage = totalCategories > 0 ? (categoriesWithMetrics / totalCategories) * 100 : 0;

    return {
      name: func.function_name || func.function_code?.toUpperCase(),
      code: func.function_code,
      coverage: coverage,
      metrics: metricsCount,
      fullMark: 100,
      color: FUNCTION_COLORS[func.function_code?.toLowerCase()] || '#666',
      categories: categories,
      categoriesWithMetrics: categoriesWithMetrics,
      totalCategories: totalCategories,
    };
  });

  // Calculate overall coverage
  const overallCoverage = chartData.length > 0
    ? chartData.reduce((sum: number, item) => sum + item.coverage, 0) / chartData.length
    : 0;

  // Identify gaps (functions with coverage below 50%)
  const significantGaps = chartData.filter(item => item.coverage < 50);
  const moderateGaps = chartData.filter(item => item.coverage >= 50 && item.coverage < 75);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 75) return '#4caf50';
    if (coverage >= 50) return '#ff9800';
    return '#f44336';
  };

  const CustomBarTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">{data.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Coverage: {data.coverage.toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Metrics: {data.metrics}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ mr: 1, color: getCoverageColor(overallCoverage) }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Overall Coverage
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: getCoverageColor(overallCoverage) }}>
                {overallCoverage.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={overallCoverage}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(overallCoverage),
                    borderRadius: 3,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon sx={{ mr: 1, color: significantGaps.length > 0 ? 'error.main' : 'success.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Critical Gaps
                </Typography>
              </Box>
              <Typography variant="h4" color={significantGaps.length > 0 ? 'error.main' : 'success.main'}>
                {significantGaps.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Functions below 50% coverage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Metrics
                </Typography>
              </Box>
              <Typography variant="h4">
                {chartData.reduce((sum: number, item) => sum + item.metrics, 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across {chartData.length} functions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Bar Chart */}
        {showBar && (
          <Grid item xs={12} md={showRadar ? 6 : 12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage by Function
              </Typography>
              <ResponsiveContainer width="100%" height={height}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="coverage" name="Coverage %">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCoverageColor(entry.coverage)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Radar Chart */}
        {showRadar && (
          <Grid item xs={12} md={showBar ? 6 : 12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={height}>
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Coverage"
                    dataKey="coverage"
                    stroke="#2196f3"
                    fill="#2196f3"
                    fillOpacity={0.5}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Gap Details */}
      {(significantGaps.length > 0 || moderateGaps.length > 0) && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Gap Analysis Details
          </Typography>

          {/* Critical Gaps - Functions below 50% */}
          {significantGaps.length > 0 && (
            <Alert severity="error" sx={{ mb: 2, bgcolor: 'transparent', border: '1px solid', borderColor: 'error.light' }}>
              <AlertTitle>Critical Coverage Gaps</AlertTitle>
              <Typography variant="body2" sx={{ mb: 2 }}>
                These functions have less than 50% category coverage. Expanding monitoring in these areas should be a priority.
              </Typography>

              {significantGaps.map((gap) => {
                const uncoveredCategories = gap.categories.filter((c: CategoryData) => c.metric_count === 0);
                const lowCoverageCategories = gap.categories.filter((c: CategoryData) => c.metric_count > 0 && c.metric_count < 3);

                return (
                  <Box key={gap.code} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1,
                        p: 1,
                        mx: -1,
                      }}
                      onClick={() => toggleFunction(gap.code)}
                    >
                      <WarningIcon color="error" sx={{ mr: 1 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">
                          {gap.name} ({gap.code.toUpperCase()})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {gap.categoriesWithMetrics} of {gap.totalCategories} categories covered • {gap.metrics} total metrics
                        </Typography>
                      </Box>
                      <Chip
                        label={`${gap.coverage.toFixed(0)}%`}
                        color="error"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <IconButton size="small">
                        {expandedFunctions[gap.code] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>

                    <Collapse in={expandedFunctions[gap.code]}>
                      <Box sx={{ pl: 2, mt: 2 }}>
                        {uncoveredCategories.length > 0 && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="error.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmptyIcon sx={{ fontSize: 14 }} />
                              Categories Without Metrics ({uncoveredCategories.length})
                            </Typography>
                            {uncoveredCategories.map((cat: CategoryData) => {
                              const insight = getCategoryInsight(cat.category_code);
                              return (
                                <Box
                                  key={cat.category_code}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    bgcolor: 'rgba(255,255,255,0.7)',
                                    borderRadius: 1,
                                    borderLeft: '3px solid',
                                    borderColor: 'error.main',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{cat.category_name}</Typography>
                                    <Chip label={cat.category_code} size="small" variant="outlined" />
                                  </Box>

                                  <Grid container spacing={3}>
                                    {/* Left column - Risk & Impact */}
                                    <Grid item xs={12} md={6}>
                                      <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Risk
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                          {insight.riskDescription}
                                        </Typography>
                                      </Box>

                                      <Box>
                                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Business Impact
                                        </Typography>
                                        <Typography variant="body2" color="error.dark" sx={{ mt: 0.5 }}>
                                          {insight.businessImpact}
                                        </Typography>
                                      </Box>
                                    </Grid>

                                    {/* Right column - Suggested Metrics & Actions */}
                                    <Grid item xs={12} md={6}>
                                      <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 1.5, borderRadius: 1, height: '100%' }}>
                                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Recommended Metrics to Add
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                          {insight.exampleMetrics.map((metric, idx) => {
                                            const metricKey = `${cat.category_code}-${metric}`;
                                            const isCreating = creatingMetrics[metricKey];
                                            return (
                                              <Box
                                                key={idx}
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  mb: 0.75,
                                                  '&:last-child': { mb: 0 },
                                                  '&:hover .add-btn': { opacity: 1 },
                                                }}
                                              >
                                                <Tooltip title="Add this metric">
                                                  <IconButton
                                                    size="small"
                                                    className="add-btn"
                                                    onClick={() => handleAddMetric(metric, cat.category_code)}
                                                    disabled={isCreating}
                                                    sx={{
                                                      p: 0.25,
                                                      mr: 0.75,
                                                      opacity: 0.6,
                                                      transition: 'opacity 0.2s',
                                                      bgcolor: 'primary.main',
                                                      color: 'white',
                                                      '&:hover': { bgcolor: 'primary.dark' },
                                                      '&.Mui-disabled': { bgcolor: 'grey.300' },
                                                    }}
                                                  >
                                                    {isCreating ? (
                                                      <CircularProgress size={14} color="inherit" />
                                                    ) : (
                                                      <AddIcon sx={{ fontSize: 14 }} />
                                                    )}
                                                  </IconButton>
                                                </Tooltip>
                                                <Typography variant="body2" sx={{ lineHeight: 1.4, flex: 1 }}>
                                                  {metric}
                                                </Typography>
                                              </Box>
                                            );
                                          })}
                                        </Box>
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Box>
                              );
                            })}
                          </Box>
                        )}

                        {lowCoverageCategories.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="warning.dark" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FilledIcon sx={{ fontSize: 14 }} />
                              Categories With Limited Coverage ({lowCoverageCategories.length})
                            </Typography>
                            {lowCoverageCategories.map((cat: CategoryData) => {
                              const insight = getCategoryInsight(cat.category_code);
                              return (
                                <Box
                                  key={cat.category_code}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    bgcolor: 'rgba(255,255,255,0.7)',
                                    borderRadius: 1,
                                    borderLeft: '3px solid',
                                    borderColor: 'warning.main',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {cat.category_name}
                                      <Chip
                                        label={`${cat.metric_count} metric${cat.metric_count > 1 ? 's' : ''}`}
                                        size="small"
                                        color="warning"
                                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                      />
                                    </Typography>
                                    <Chip label={cat.category_code} size="small" variant="outlined" />
                                  </Box>

                                  <Grid container spacing={3}>
                                    {/* Left column - Risk */}
                                    <Grid item xs={12} md={6}>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Risk
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                          {insight.riskDescription}
                                        </Typography>
                                      </Box>
                                    </Grid>

                                    {/* Right column - Additional Metrics */}
                                    <Grid item xs={12} md={6}>
                                      <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 1.5, borderRadius: 1, height: '100%' }}>
                                        <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Consider Adding
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                          {insight.exampleMetrics.slice(0, 2).map((metric, idx) => {
                                            const metricKey = `${cat.category_code}-${metric}`;
                                            const isCreating = creatingMetrics[metricKey];
                                            return (
                                              <Box
                                                key={idx}
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  mb: 0.75,
                                                  '&:last-child': { mb: 0 },
                                                  '&:hover .add-btn': { opacity: 1 },
                                                }}
                                              >
                                                <Tooltip title="Add this metric">
                                                  <IconButton
                                                    size="small"
                                                    className="add-btn"
                                                    onClick={() => handleAddMetric(metric, cat.category_code)}
                                                    disabled={isCreating}
                                                    sx={{
                                                      p: 0.25,
                                                      mr: 0.75,
                                                      opacity: 0.6,
                                                      transition: 'opacity 0.2s',
                                                      bgcolor: 'warning.main',
                                                      color: 'white',
                                                      '&:hover': { bgcolor: 'warning.dark' },
                                                      '&.Mui-disabled': { bgcolor: 'grey.300' },
                                                    }}
                                                  >
                                                    {isCreating ? (
                                                      <CircularProgress size={14} color="inherit" />
                                                    ) : (
                                                      <AddIcon sx={{ fontSize: 14 }} />
                                                    )}
                                                  </IconButton>
                                                </Tooltip>
                                                <Typography variant="body2" sx={{ lineHeight: 1.4, flex: 1 }}>
                                                  {metric}
                                                </Typography>
                                              </Box>
                                            );
                                          })}
                                        </Box>
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Alert>
          )}

          {/* Moderate Gaps - Functions 50-75% */}
          {moderateGaps.length > 0 && (
            <Alert severity="warning" sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'warning.light' }}>
              <AlertTitle>Moderate Coverage Gaps</AlertTitle>
              <Typography variant="body2" sx={{ mb: 2 }}>
                These functions have partial coverage. Adding metrics in the listed categories would improve your security posture visibility.
              </Typography>

              {moderateGaps.map((gap) => {
                const uncoveredCategories = gap.categories.filter((c: CategoryData) => c.metric_count === 0);
                const lowCoverageCategories = gap.categories.filter((c: CategoryData) => c.metric_count > 0 && c.metric_count < 3);

                return (
                  <Box key={gap.code} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1,
                        p: 1,
                        mx: -1,
                      }}
                      onClick={() => toggleFunction(gap.code)}
                    >
                      <CategoryIcon color="warning" sx={{ mr: 1 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">
                          {gap.name} ({gap.code.toUpperCase()})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {gap.categoriesWithMetrics} of {gap.totalCategories} categories covered • {gap.metrics} total metrics
                        </Typography>
                      </Box>
                      <Chip
                        label={`${gap.coverage.toFixed(0)}%`}
                        color="warning"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <IconButton size="small">
                        {expandedFunctions[gap.code] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>

                    <Collapse in={expandedFunctions[gap.code]}>
                      <Box sx={{ pl: 2, mt: 2 }}>
                        {uncoveredCategories.length > 0 && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="error.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmptyIcon sx={{ fontSize: 14 }} />
                              Categories Without Metrics ({uncoveredCategories.length})
                            </Typography>
                            {uncoveredCategories.map((cat: CategoryData) => {
                              const insight = getCategoryInsight(cat.category_code);
                              return (
                                <Box
                                  key={cat.category_code}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    bgcolor: 'rgba(255,255,255,0.7)',
                                    borderRadius: 1,
                                    borderLeft: '3px solid',
                                    borderColor: 'error.main',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{cat.category_name}</Typography>
                                    <Chip label={cat.category_code} size="small" variant="outlined" />
                                  </Box>

                                  <Grid container spacing={3}>
                                    {/* Left column - Risk & Impact */}
                                    <Grid item xs={12} md={6}>
                                      <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Risk
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                          {insight.riskDescription}
                                        </Typography>
                                      </Box>

                                      <Box>
                                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Business Impact
                                        </Typography>
                                        <Typography variant="body2" color="error.dark" sx={{ mt: 0.5 }}>
                                          {insight.businessImpact}
                                        </Typography>
                                      </Box>
                                    </Grid>

                                    {/* Right column - Suggested Metrics */}
                                    <Grid item xs={12} md={6}>
                                      <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 1.5, borderRadius: 1, height: '100%' }}>
                                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Recommended Metrics to Add
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                          {insight.exampleMetrics.map((metric, idx) => {
                                            const metricKey = `${cat.category_code}-${metric}`;
                                            const isCreating = creatingMetrics[metricKey];
                                            return (
                                              <Box
                                                key={idx}
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  mb: 0.75,
                                                  '&:last-child': { mb: 0 },
                                                  '&:hover .add-btn': { opacity: 1 },
                                                }}
                                              >
                                                <Tooltip title="Add this metric">
                                                  <IconButton
                                                    size="small"
                                                    className="add-btn"
                                                    onClick={() => handleAddMetric(metric, cat.category_code)}
                                                    disabled={isCreating}
                                                    sx={{
                                                      p: 0.25,
                                                      mr: 0.75,
                                                      opacity: 0.6,
                                                      transition: 'opacity 0.2s',
                                                      bgcolor: 'primary.main',
                                                      color: 'white',
                                                      '&:hover': { bgcolor: 'primary.dark' },
                                                      '&.Mui-disabled': { bgcolor: 'grey.300' },
                                                    }}
                                                  >
                                                    {isCreating ? (
                                                      <CircularProgress size={14} color="inherit" />
                                                    ) : (
                                                      <AddIcon sx={{ fontSize: 14 }} />
                                                    )}
                                                  </IconButton>
                                                </Tooltip>
                                                <Typography variant="body2" sx={{ lineHeight: 1.4, flex: 1 }}>
                                                  {metric}
                                                </Typography>
                                              </Box>
                                            );
                                          })}
                                        </Box>
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Box>
                              );
                            })}
                          </Box>
                        )}

                        {lowCoverageCategories.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="warning.dark" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FilledIcon sx={{ fontSize: 14 }} />
                              Categories With Limited Coverage ({lowCoverageCategories.length})
                            </Typography>
                            {lowCoverageCategories.map((cat: CategoryData) => {
                              const insight = getCategoryInsight(cat.category_code);
                              return (
                                <Box
                                  key={cat.category_code}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    bgcolor: 'rgba(255,255,255,0.7)',
                                    borderRadius: 1,
                                    borderLeft: '3px solid',
                                    borderColor: 'warning.main',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {cat.category_name}
                                      <Chip
                                        label={`${cat.metric_count} metric${cat.metric_count > 1 ? 's' : ''}`}
                                        size="small"
                                        color="warning"
                                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                      />
                                    </Typography>
                                    <Chip label={cat.category_code} size="small" variant="outlined" />
                                  </Box>

                                  <Grid container spacing={3}>
                                    {/* Left column - Risk */}
                                    <Grid item xs={12} md={6}>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Risk
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                          {insight.riskDescription}
                                        </Typography>
                                      </Box>
                                    </Grid>

                                    {/* Right column - Additional Metrics */}
                                    <Grid item xs={12} md={6}>
                                      <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 1.5, borderRadius: 1, height: '100%' }}>
                                        <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                          Consider Adding
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                          {insight.exampleMetrics.slice(0, 2).map((metric, idx) => {
                                            const metricKey = `${cat.category_code}-${metric}`;
                                            const isCreating = creatingMetrics[metricKey];
                                            return (
                                              <Box
                                                key={idx}
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  mb: 0.75,
                                                  '&:last-child': { mb: 0 },
                                                  '&:hover .add-btn': { opacity: 1 },
                                                }}
                                              >
                                                <Tooltip title="Add this metric">
                                                  <IconButton
                                                    size="small"
                                                    className="add-btn"
                                                    onClick={() => handleAddMetric(metric, cat.category_code)}
                                                    disabled={isCreating}
                                                    sx={{
                                                      p: 0.25,
                                                      mr: 0.75,
                                                      opacity: 0.6,
                                                      transition: 'opacity 0.2s',
                                                      bgcolor: 'warning.main',
                                                      color: 'white',
                                                      '&:hover': { bgcolor: 'warning.dark' },
                                                      '&.Mui-disabled': { bgcolor: 'grey.300' },
                                                    }}
                                                  >
                                                    {isCreating ? (
                                                      <CircularProgress size={14} color="inherit" />
                                                    ) : (
                                                      <AddIcon sx={{ fontSize: 14 }} />
                                                    )}
                                                  </IconButton>
                                                </Tooltip>
                                                <Typography variant="body2" sx={{ lineHeight: 1.4, flex: 1 }}>
                                                  {metric}
                                                </Typography>
                                              </Box>
                                            );
                                          })}
                                        </Box>
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Alert>
          )}
        </Paper>
      )}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* All functions covered well */}
      {significantGaps.length === 0 && moderateGaps.length === 0 && chartData.length > 0 && (
        <Alert severity="success" sx={{ mt: 3 }} icon={<CheckCircleIcon />}>
          <AlertTitle>Excellent Coverage!</AlertTitle>
          All framework functions have at least 75% metric coverage. Your security monitoring is comprehensive.
        </Alert>
      )}
    </Box>
  );
};

export default GapAnalysisChart;
