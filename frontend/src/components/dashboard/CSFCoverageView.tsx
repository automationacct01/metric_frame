import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';

// Unified blue color for all CSF functions (neutral, non-risk color)
const FUNCTION_COLORS: Record<string, { bg: string; text: string }> = {
  gv: { bg: '#e3f2fd', text: '#1565c0' },   // Blue - Govern
  id: { bg: '#e3f2fd', text: '#1565c0' },   // Blue - Identify
  pr: { bg: '#e3f2fd', text: '#1565c0' },   // Blue - Protect
  de: { bg: '#e3f2fd', text: '#1565c0' },   // Blue - Detect
  rs: { bg: '#e3f2fd', text: '#1565c0' },   // Blue - Respond
  rc: { bg: '#e3f2fd', text: '#1565c0' },   // Blue - Recover
};

// Category colors (purple)
const CATEGORY_COLOR = { bg: '#ede7f6', text: '#5e35b1' };

// Subcategory colors (cyan)
const SUBCATEGORY_COLOR = { bg: '#e0f7fa', text: '#00838f' };

// Get color for a function code
const getFunctionColor = (code: string): { bg: string; text: string } => {
  const normalized = code.toLowerCase();
  return FUNCTION_COLORS[normalized] || { bg: '#e3f2fd', text: '#1565c0' };
};

interface SubcategoryData {
  code: string;
  outcome: string;
  metric_count: number;
}

interface CategoryData {
  code: string;
  name: string;
  description?: string;
  subcategories: SubcategoryData[];
  total_subcategories: number;
  covered_subcategories: number;
  metric_count: number;
}

interface FunctionData {
  code: string;
  name: string;
  description?: string;
  color_hex?: string;
  categories: CategoryData[];
  total_categories: number;
  covered_categories: number;
  total_subcategories: number;
  covered_subcategories: number;
  metric_count: number;
}

interface CoverageData {
  framework_code: string;
  framework_name: string;
  functions: FunctionData[];
  summary: {
    total_functions: number;
    covered_functions: number;
    total_categories: number;
    covered_categories: number;
    total_subcategories: number;
    covered_subcategories: number;
    total_metrics: number;
  };
}

// Row component for each level of the tree
interface TreeRowProps {
  level: 'function' | 'category' | 'subcategory';
  code: string;
  name: string;
  description?: string;
  metricCount: number;
  totalItems?: number;
  coveredItems?: number;
  functionCode?: string;  // Parent function code for color inheritance
  expanded?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
  indent?: number;
}

function TreeRow({
  level,
  code,
  name,
  description,
  metricCount,
  totalItems,
  coveredItems,
  functionCode: _functionCode,  // Reserved for future use
  expanded,
  onToggle,
  hasChildren,
  indent = 0,
}: TreeRowProps) {
  // Determine chip colors based on level
  const getChipColors = () => {
    if (level === 'function') {
      return getFunctionColor(code);
    } else if (level === 'category') {
      return CATEGORY_COLOR;
    } else {
      return SUBCATEGORY_COLOR;
    }
  };
  const chipColors = getChipColors();
  const coveragePercent = totalItems && totalItems > 0
    ? Math.round((coveredItems || 0) / totalItems * 100)
    : null;

  const getCoverageColor = (percent: number | null) => {
    if (percent === null) return '#9e9e9e';
    if (percent >= 80) return '#4caf50';
    if (percent >= 50) return '#ff9800';
    return '#f44336';
  };

  const getCoverageIcon = (percent: number | null) => {
    if (percent === null) return null;
    if (percent >= 80) return <CheckCircleIcon fontSize="small" sx={{ color: '#4caf50' }} />;
    if (percent >= 50) return <WarningIcon fontSize="small" sx={{ color: '#ff9800' }} />;
    return <ErrorIcon fontSize="small" sx={{ color: '#f44336' }} />;
  };

  const levelStyles = {
    function: { fontWeight: 600, fontSize: '1rem' },
    category: { fontWeight: 500, fontSize: '0.95rem' },
    subcategory: { fontWeight: 400, fontSize: '0.875rem', color: '#666' },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        py: 1.5,
        px: 2,
        pl: 2 + indent * 3,
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: level === 'function' ? '#fafafa' : 'white',
        '&:hover': {
          backgroundColor: '#f5f5f5',
        },
        cursor: hasChildren ? 'pointer' : 'default',
        minHeight: 48,
      }}
      onClick={hasChildren ? onToggle : undefined}
    >
      {/* Expand/Collapse Icon */}
      <Box sx={{ width: 28, flexShrink: 0, pt: 0.5 }}>
        {hasChildren && (
          <IconButton size="small" sx={{ p: 0 }}>
            {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Box>

      {/* Code Chip */}
      <Box sx={{ flexShrink: 0, pt: 0.25 }}>
        <Chip
          label={code}
          size="small"
          sx={{
            minWidth: level === 'function' ? 60 : level === 'category' ? 80 : 100,
            fontWeight: 600,
            fontSize: '0.75rem',
            backgroundColor: chipColors.bg,
            color: chipColors.text,
            mr: 2,
          }}
        />
      </Box>

      {/* Name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ ...levelStyles[level], whiteSpace: 'normal', wordWrap: 'break-word' }}>
          {name}
        </Typography>
        {description && level !== 'subcategory' && (
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{
              display: 'block',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: 1.4,
              mt: 0.5,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {/* Metrics Count */}
      <Box sx={{ width: 100, textAlign: 'center', flexShrink: 0, pt: 0.25 }}>
        <Chip
          label={`${metricCount} metric${metricCount !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            backgroundColor: metricCount > 0 ? '#e8f5e9' : '#ffebee',
            color: metricCount > 0 ? '#2e7d32' : '#c62828',
            fontWeight: 500,
          }}
        />
      </Box>

      {/* Coverage (only for function and category levels) */}
      {coveragePercent !== null && (
        <Box sx={{ width: 180, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, pt: 0.5 }}>
          {getCoverageIcon(coveragePercent)}
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={coveragePercent}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getCoverageColor(coveragePercent),
                  borderRadius: 4,
                },
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ minWidth: 40, fontWeight: 500 }}>
            {coveragePercent}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function CSFCoverageView() {
  const { selectedFramework, isLoadingFrameworks } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch framework hierarchy (returns full detail with functions/categories/subcategories)
  const { data: frameworkDetail, isLoading: loadingFramework } = useQuery<any>({
    queryKey: ['framework-detail', frameworkCode],
    queryFn: () => apiClient.getFramework(frameworkCode),
    enabled: !isLoadingFrameworks && !!frameworkCode,
  });

  // Fetch metrics to count by subcategory
  const { data: metricsData, isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics-for-coverage', frameworkCode],
    queryFn: () => apiClient.getMetrics({ framework: frameworkCode, limit: 1000 }),
    enabled: !isLoadingFrameworks && !!frameworkCode,
  });

  // Build combined coverage data with subcategory counts
  const processedCoverage = useMemo<CoverageData | null>(() => {
    if (!frameworkDetail || !metricsData) return null;

    const metrics = metricsData.items || [];

    // Count metrics by subcategory code
    const subcategoryMetricCounts: Record<string, number> = {};
    const categoryMetricCounts: Record<string, number> = {};
    const functionMetricCounts: Record<string, number> = {};

    metrics.forEach((metric: any) => {
      const subcatCode = metric.csf_subcategory_code;
      const catCode = metric.csf_category_code;
      const funcCode = metric.csf_function;

      if (subcatCode) {
        subcategoryMetricCounts[subcatCode] = (subcategoryMetricCounts[subcatCode] || 0) + 1;
      }
      if (catCode) {
        categoryMetricCounts[catCode] = (categoryMetricCounts[catCode] || 0) + 1;
      }
      if (funcCode) {
        functionMetricCounts[funcCode] = (functionMetricCounts[funcCode] || 0) + 1;
      }
    });

    // Build hierarchical structure
    const functions: FunctionData[] = (frameworkDetail.functions || []).map((func: any) => {
      const categories: CategoryData[] = (func.categories || []).map((cat: any) => {
        const subcategories: SubcategoryData[] = (cat.subcategories || []).map((subcat: any) => ({
          code: subcat.code,
          outcome: subcat.outcome,
          metric_count: subcategoryMetricCounts[subcat.code] || 0,
        })).sort((a, b) => a.code.localeCompare(b.code));  // Sort subcategories by code

        const coveredSubcats = subcategories.filter(s => s.metric_count > 0).length;

        return {
          code: cat.code,
          name: cat.name,
          description: cat.description,
          subcategories,
          total_subcategories: subcategories.length,
          covered_subcategories: coveredSubcats,
          metric_count: categoryMetricCounts[cat.code] || subcategories.reduce((sum, s) => sum + s.metric_count, 0),
        };
      }).sort((a, b) => a.code.localeCompare(b.code));  // Sort categories by code

      const totalSubcats = categories.reduce((sum, c) => sum + c.total_subcategories, 0);
      const coveredSubcats = categories.reduce((sum, c) => sum + c.covered_subcategories, 0);
      const coveredCats = categories.filter(c => c.metric_count > 0).length;

      return {
        code: func.code,
        name: func.name,
        description: func.description,
        color_hex: func.color_hex,
        categories,
        total_categories: categories.length,
        covered_categories: coveredCats,
        total_subcategories: totalSubcats,
        covered_subcategories: coveredSubcats,
        metric_count: functionMetricCounts[func.code] || categories.reduce((sum, c) => sum + c.metric_count, 0),
      };
    }).sort((a, b) => {
      // Sort functions in CSF order: GV, ID, PR, DE, RS, RC
      const order = ['gv', 'id', 'pr', 'de', 'rs', 'rc'];
      return order.indexOf(a.code.toLowerCase()) - order.indexOf(b.code.toLowerCase());
    });

    const summary = {
      total_functions: functions.length,
      covered_functions: functions.filter(f => f.metric_count > 0).length,
      total_categories: functions.reduce((sum, f) => sum + f.total_categories, 0),
      covered_categories: functions.reduce((sum, f) => sum + f.covered_categories, 0),
      total_subcategories: functions.reduce((sum, f) => sum + f.total_subcategories, 0),
      covered_subcategories: functions.reduce((sum, f) => sum + f.covered_subcategories, 0),
      total_metrics: metrics.length,
    };

    return {
      framework_code: frameworkCode,
      framework_name: frameworkDetail.name || selectedFramework?.name || 'Framework',
      functions,
      summary,
    };
  }, [frameworkDetail, metricsData, frameworkCode, selectedFramework]);

  const toggleFunction = (code: string) => {
    setExpandedFunctions(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleCategory = (code: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (processedCoverage) {
      setExpandedFunctions(new Set(processedCoverage.functions.map(f => f.code)));
      const allCats: string[] = [];
      processedCoverage.functions.forEach(f => {
        f.categories.forEach(c => allCats.push(c.code));
      });
      setExpandedCategories(new Set(allCats));
    }
  };

  const collapseAll = () => {
    setExpandedFunctions(new Set());
    setExpandedCategories(new Set());
  };

  if (loadingFramework || loadingMetrics || isLoadingFrameworks) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Loading coverage data...
        </Typography>
      </Box>
    );
  }

  if (!processedCoverage) {
    return (
      <Alert severity="warning">
        Unable to load framework coverage data. Please ensure the framework is configured.
      </Alert>
    );
  }

  const { summary, functions } = processedCoverage;
  const overallCoverage = summary.total_subcategories > 0
    ? Math.round(summary.covered_subcategories / summary.total_subcategories * 100)
    : 0;

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {summary.total_metrics}
              </Typography>
              <Typography variant="body2" color="textSecondary">Total Metrics</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: overallCoverage >= 80 ? 'success.main' : overallCoverage >= 50 ? 'warning.main' : 'error.main' }}>
                {overallCoverage}%
              </Typography>
              <Typography variant="body2" color="textSecondary">Overall Coverage</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {summary.covered_functions}/{summary.total_functions}
              </Typography>
              <Typography variant="body2" color="textSecondary">Functions Covered</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {summary.covered_categories}/{summary.total_categories}
              </Typography>
              <Typography variant="body2" color="textSecondary">Categories Covered</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {summary.covered_subcategories}/{summary.total_subcategories}
              </Typography>
              <Typography variant="body2" color="textSecondary">Subcategories Covered</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tree Header */}
      <Paper sx={{ mb: 0 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '2px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
        }}>
          <Typography variant="h6">
            {processedCoverage.framework_name} Hierarchy
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Expand All"
              size="small"
              onClick={expandAll}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Collapse All"
              size="small"
              onClick={collapseAll}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Box>

        {/* Column Headers */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 2,
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#fafafa',
        }}>
          <Box sx={{ width: 28 }} />
          <Typography variant="caption" sx={{ minWidth: 100, fontWeight: 600, mr: 2 }}>Code</Typography>
          <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>Name / Description</Typography>
          <Typography variant="caption" sx={{ width: 100, textAlign: 'center', fontWeight: 600 }}>Metrics</Typography>
          <Typography variant="caption" sx={{ width: 180, textAlign: 'center', fontWeight: 600 }}>Coverage</Typography>
        </Box>

        {/* Tree Content */}
        <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
          {functions.map((func) => (
            <Box key={func.code}>
              {/* Function Row */}
              <TreeRow
                level="function"
                code={func.code.toUpperCase()}
                name={func.name}
                description={func.description}
                metricCount={func.metric_count}
                totalItems={func.total_subcategories}
                coveredItems={func.covered_subcategories}
                functionCode={func.code}
                expanded={expandedFunctions.has(func.code)}
                onToggle={() => toggleFunction(func.code)}
                hasChildren={func.categories.length > 0}
              />

              {/* Categories */}
              <Collapse in={expandedFunctions.has(func.code)}>
                {func.categories.map((cat) => (
                  <Box key={cat.code}>
                    {/* Category Row */}
                    <TreeRow
                      level="category"
                      code={cat.code}
                      name={cat.name}
                      description={cat.description}
                      metricCount={cat.metric_count}
                      totalItems={cat.total_subcategories}
                      coveredItems={cat.covered_subcategories}
                      expanded={expandedCategories.has(cat.code)}
                      onToggle={() => toggleCategory(cat.code)}
                      hasChildren={cat.subcategories.length > 0}
                      indent={1}
                    />

                    {/* Subcategories */}
                    <Collapse in={expandedCategories.has(cat.code)}>
                      {cat.subcategories.map((subcat) => (
                        <TreeRow
                          key={subcat.code}
                          level="subcategory"
                          code={subcat.code}
                          name={subcat.outcome}
                          metricCount={subcat.metric_count}
                          indent={2}
                        />
                      ))}
                    </Collapse>
                  </Box>
                ))}
              </Collapse>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
