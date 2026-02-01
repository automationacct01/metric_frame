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
  metrics_below_target_count: number;
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

export enum AIRMFFunction {
  GOVERN = 'govern',
  MAP = 'map',
  MEASURE = 'measure',
  MANAGE = 'manage'
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

export enum UpdateType {
  ADJUSTMENT = 'adjustment',  // Correction/fix - audit log only, no trend data
  PERIOD_UPDATE = 'period_update'  // New period value - both history and audit log
}

export interface Metric {
  id: string;
  metric_number?: string;
  name: string;
  description?: string;
  formula?: string;
  calc_expr_json?: any;
  // NIST CSF 2.0 fields
  csf_function: CSFFunction;
  csf_category_code?: string;
  csf_subcategory_code?: string;
  csf_category_name?: string;
  csf_subcategory_outcome?: string;
  // NIST AI RMF 1.0 fields
  ai_rmf_function?: AIRMFFunction;
  ai_rmf_function_name?: string;
  ai_rmf_category_code?: string;
  ai_rmf_category_name?: string;
  ai_rmf_subcategory_code?: string;
  ai_rmf_subcategory_outcome?: string;
  trustworthiness_characteristic?: string;
  // Common fields
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
  business_impact?: string;  // Business consequences if this area is not monitored
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

export interface MetricVersionResponse {
  id: string;
  metric_id: string;
  version_number: number;
  snapshot_json: Record<string, any>;
  changed_fields?: string[];
  changed_by?: string;
  change_source?: string;
  change_notes?: string;
  created_at: string;
}

export interface MetricVersionDiff {
  metric_id: string;
  version_a: number;
  version_b: number;
  diff: Record<string, { from: any; to: any }>;
  snapshot_a: Record<string, any>;
  snapshot_b: Record<string, any>;
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
  metric_number?: string;
  score_pct?: number;
  gap_to_target_pct?: number;
  current_value?: number;
  target_value?: number;
  priority_rank: number;
  owner_function?: string;
  direction?: string;
  data_source?: string;
  risk_definition?: string;
  business_impact?: string;
  formula?: string;
  collection_frequency?: string;
  last_collected_at?: string;
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

export type MetricType = 'all' | 'cyber' | 'ai_profile';

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
  metric_type?: MetricType;  // Filter by Cyber vs AI Profile metrics
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

// AI RMF Function names and descriptions
export const AI_RMF_FUNCTION_NAMES: Record<AIRMFFunction, string> = {
  [AIRMFFunction.GOVERN]: 'Govern',
  [AIRMFFunction.MAP]: 'Map',
  [AIRMFFunction.MEASURE]: 'Measure',
  [AIRMFFunction.MANAGE]: 'Manage'
};

export const AI_RMF_FUNCTION_DESCRIPTIONS: Record<AIRMFFunction, string> = {
  [AIRMFFunction.GOVERN]: 'AI governance and risk management culture',
  [AIRMFFunction.MAP]: 'Context recognition and risk identification',
  [AIRMFFunction.MEASURE]: 'Risk analysis, tracking, and measurement',
  [AIRMFFunction.MANAGE]: 'Risk prioritization and response'
};

// AI RMF Trustworthiness Characteristics
export const AI_RMF_TRUSTWORTHINESS: Record<string, string> = {
  'valid_reliable': 'Valid and Reliable',
  'safe': 'Safe',
  'secure_resilient': 'Secure and Resilient',
  'accountable_transparent': 'Accountable and Transparent',
  'explainable_interpretable': 'Explainable and Interpretable',
  'privacy_enhanced': 'Privacy-Enhanced',
  'fair': 'Fair (Harmful Bias Managed)'
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

// ==============================================================================
// AI PROVIDER TYPES
// ==============================================================================

export type AIAuthType = 'api_key' | 'azure' | 'aws_iam' | 'gcp';

export interface AuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  help_text?: string;
  default?: string;
  options?: string[];
}

export interface AIModel {
  id: string;
  provider_id: string;
  model_id: string;
  display_name: string;
  context_window?: number;
  max_output_tokens?: number;
  supports_vision: boolean;
  cost_per_1k_input?: number;
  cost_per_1k_output?: number;
  active: boolean;
}

export interface AIProvider {
  id?: string;
  code: string;
  name: string;
  description?: string;
  auth_type: AIAuthType;
  auth_fields: AuthField[];
  active?: boolean;
  created_at?: string;
  models?: AIModel[];
  default_model?: string;
  available?: boolean;
  unavailable_reason?: string;
}

export interface AIConfiguration {
  id: string;
  user_id: string;
  provider_id: string;
  provider_code?: string;
  provider_name?: string;
  is_active: boolean;
  model_id?: string;
  max_tokens: number;
  temperature: number;
  credentials_validated: boolean;
  last_validated_at?: string;
  validation_error?: string;
  created_at: string;
  updated_at: string;
}

export interface AIConfigurationCreate {
  provider_code: string;
  credentials: Record<string, string>;
  model_id?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AIConfigurationUpdate {
  credentials?: Record<string, string>;
  model_id?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AIValidationResult {
  valid: boolean;
  provider_code: string;
  message?: string;
  validated_at?: string;
}

export interface AIProviderStatus {
  available: boolean;
  model?: string;
  provider?: string;
  dev_mode: boolean;
  dev_provider?: string;
  legacy_api_key_present: boolean;
  supported_providers: string[];
  supported_modes: string[];
  supported_frameworks: string[];
}

// ==============================================================================
// USER MANAGEMENT TYPES
// ==============================================================================

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface UserRecord {
  id: string;
  name: string;
  email: string | null;
  role: UserRole | null;
  active: boolean;
  selected_framework_id?: string | null;
  onboarding_completed?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserCreate {
  name: string;
  email: string;
  role: UserRole;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
}

export interface UserRoleAssign {
  role: UserRole;
}