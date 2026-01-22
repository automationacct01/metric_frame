// Type definitions for Multi-Framework Cybersecurity Metrics Application
// Supports NIST CSF 2.0, AI RMF 1.0, and Cyber AI Profile

// ==============================================================================
// FRAMEWORK TYPES
// ==============================================================================

export interface Framework {
  id: string;
  code: string;
  name: string;
  version?: string;
  description?: string;
  source_url?: string;
  active: boolean;
  is_extension?: boolean;
  created_at?: string;
}

export interface FrameworkFunction {
  id: string;
  framework_id: string;
  code: string;
  name: string;
  description?: string;
  display_order: number;
  color_hex?: string;
  icon_name?: string;
}

export interface FrameworkCategory {
  id: string;
  function_id: string;
  code: string;
  name: string;
  description?: string;
  display_order: number;
}

export interface FrameworkSubcategory {
  id: string;
  category_id: string;
  code: string;
  outcome: string;
  display_order: number;
}

// Framework score types for multi-framework support
export interface FrameworkFunctionScore {
  function_code: string;
  function_name: string;
  function_description?: string;
  color_hex?: string;
  score_pct: number;
  risk_rating: string;
  metrics_count: number;
  weighted_score: number;
}

export interface FrameworkScoresResponse {
  framework_code: string;
  function_scores: FrameworkFunctionScore[];
  overall_score_pct: number;
  overall_risk_rating: string;
  total_metrics: number;
  metrics_with_data: number;
  last_updated: string;
}

export interface FrameworkCoverage {
  framework_code: string;
  total_metrics: number;
  functions: {
    function_code: string;
    function_name: string;
    metric_count: number;
    categories: {
      category_code: string;
      category_name: string;
      metric_count: number;
    }[];
  }[];
}

// AI Recommendations types
export interface MetricRecommendation {
  metric_name: string;
  description: string;
  function_code: string;
  category_code?: string;
  priority: number;
  rationale: string;
  expected_impact: string;
}

export interface RecommendationsResponse {
  success: boolean;
  framework_code: string;
  recommendations: MetricRecommendation[];
  gap_analysis?: {
    underrepresented_functions: string[];
    coverage_percentage: number;
    overall_assessment: string;
  };
  current_coverage?: Record<string, number>;
  current_overall_score?: number;
  error?: string;
}

export interface CoverageGaps {
  framework_code: string;
  functions_without_metrics: {
    function_code: string;
    function_name: string;
    description?: string;
  }[];
  functions_with_low_coverage: {
    function_code: string;
    function_name: string;
    metric_count: number;
  }[];
  categories_without_metrics: {
    category_code: string;
    category_name: string;
    function_code: string;
    function_name: string;
  }[];
  total_gap_count: number;
}

// ==============================================================================
// CSF 2.0 SPECIFIC TYPES (Legacy support)
// ==============================================================================

export enum CSFFunction {
  GOVERN = 'gv',
  IDENTIFY = 'id',
  PROTECT = 'pr',
  DETECT = 'de',
  RESPOND = 'rs',
  RECOVER = 'rc'
}

export enum MetricDirection {
  HIGHER_IS_BETTER = 'higher_is_better',
  LOWER_IS_BETTER = 'lower_is_better',
  TARGET_RANGE = 'target_range',
  BINARY = 'binary'
}

export enum CollectionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  AD_HOC = 'ad_hoc'
}

export enum RiskRating {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface Metric {
  id: string;
  metric_number?: string;
  name: string;
  description?: string;
  formula?: string;
  calc_expr_json?: any;
  csf_function: CSFFunction;
  csf_category_code?: string;
  csf_subcategory_code?: string;
  csf_category_name?: string;
  csf_subcategory_outcome?: string;
  priority_rank: number;
  weight: number;
  direction: MetricDirection;
  target_value?: number;
  target_units?: string;
  tolerance_low?: number;
  tolerance_high?: number;
  owner_function?: string;
  data_source?: string;
  collection_frequency?: CollectionFrequency;
  last_collected_at?: string;
  current_value?: number;
  current_label?: string;
  notes?: string;
  risk_definition?: string;  // Why this metric matters - business risk context
  active: boolean;
  created_at: string;
  updated_at: string;
  metric_score?: number;
  gap_to_target?: number;
  // Lock fields for inline editing
  locked: boolean;
  locked_by?: string;
  locked_at?: string;
}

export interface MetricHistory {
  id: string;
  metric_id: string;
  collected_at: string;
  raw_value_json?: any;
  normalized_value?: number;
  source_ref?: string;
}

export interface CategoryScore {
  category_code: string;
  category_name: string;
  category_description?: string;
  score_pct: number;
  risk_rating: RiskRating;
  metrics_count: number;
  metrics_below_target_count: number;
  weighted_score: number;
}

export interface CategoryDetailScore extends CategoryScore {
  metrics: CategoryMetric[];
}

export interface CategoryMetric {
  id: string;
  name: string;
  score_pct?: number;
  gap_to_target_pct?: number;
  current_value?: number;
  target_value?: number;
  priority_rank: number;
  owner_function?: string;
}

export interface CategoryScoresResponse {
  function_code: string;
  function_name: string;
  category_scores: CategoryScore[];
  total_categories: number;
  last_updated: string;
}

export interface FunctionScore {
  function: CSFFunction;
  score_pct: number;
  risk_rating: RiskRating;
  metrics_count: number;
  metrics_below_target_count: number;
  weighted_score: number;
}

export interface ScoresResponse {
  function_scores: FunctionScore[];
  overall_score: number;
  overall_risk_rating: RiskRating;
  last_updated: string;
}

export interface MetricListResponse {
  items: Metric[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface MetricFilters {
  framework?: string;  // Framework code (csf_2_0, ai_rmf)
  function?: CSFFunction;
  function_code?: string;  // Generic function code for any framework
  category_code?: string;
  subcategory_code?: string;
  priority_rank?: number;
  active?: boolean;
  search?: string;
  owner_function?: string;
  limit?: number;
  offset?: number;
}

// AI Assistant Types
export interface AIAction {
  action: 'add_metric' | 'update_metric' | 'delete_metric';
  metric?: Partial<Metric>;
  metric_id?: string;
  changes?: Record<string, any>;
}

export interface AIResponse {
  assistant_message: string;
  actions: AIAction[];
  needs_confirmation: boolean;
}

export interface AIChatRequest {
  message: string;
  mode: 'metrics' | 'explain' | 'report' | 'recommendations';
  framework?: string;  // Framework code (csf_2_0, ai_rmf, cyber_ai_profile)
  context_opts?: Record<string, any>;
}

// Dashboard Types
export interface DashboardSummary {
  function_scores: FunctionScore[];
  overall_score_pct: number;
  overall_risk_rating: RiskRating;
  total_metrics: number;
  metrics_below_target: number;
  metrics_at_target_pct: number;
  risk_distribution: Record<string, number>;
  metrics_needing_attention: any[];
  last_updated: string;
}

// UI Component Types
export interface TableColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

// API Response Types
export interface APIError {
  detail: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  database_connected: boolean;
  ai_service_available: boolean;
}

// Constants
export const CSF_FUNCTION_NAMES: Record<CSFFunction, string> = {
  [CSFFunction.GOVERN]: 'Govern',
  [CSFFunction.IDENTIFY]: 'Identify',
  [CSFFunction.PROTECT]: 'Protect',
  [CSFFunction.DETECT]: 'Detect',
  [CSFFunction.RESPOND]: 'Respond',
  [CSFFunction.RECOVER]: 'Recover'
};

export const CSF_FUNCTION_DESCRIPTIONS: Record<CSFFunction, string> = {
  [CSFFunction.GOVERN]: 'Cybersecurity governance and risk management',
  [CSFFunction.IDENTIFY]: 'Asset and risk identification',
  [CSFFunction.PROTECT]: 'Protective safeguards and controls',
  [CSFFunction.DETECT]: 'Detection of cybersecurity events',
  [CSFFunction.RESPOND]: 'Response to cybersecurity incidents',
  [CSFFunction.RECOVER]: 'Recovery from cybersecurity incidents'
};

export const RISK_RATING_COLORS: Record<RiskRating, string> = {
  [RiskRating.VERY_LOW]: '#2e7d32',  // Dark Green
  [RiskRating.LOW]: '#66bb6a',       // Light Green
  [RiskRating.MEDIUM]: '#ff9800',    // Orange
  [RiskRating.HIGH]: '#f44336',      // Light Red
  [RiskRating.VERY_HIGH]: '#d32f2f'  // Dark Red
};

export const PRIORITY_NAMES: Record<number, string> = {
  1: 'High',
  2: 'Medium', 
  3: 'Low'
};

// CSF Reference Types
export interface CSFSubcategory {
  code: string;
  outcome: string;
}

export interface CSFCategory {
  code: string;
  name: string;
  description: string;
  subcategories: CSFSubcategory[];
}

export interface CSFFunctionDetails {
  code: string;
  name: string;
  description: string;
  categories: CSFCategory[];
}

export interface CSFValidationResponse {
  valid: boolean;
  message?: string;
}

export interface CSFSuggestionResponse {
  category_code: string;
  category_name: string;
  confidence_score: number;
}