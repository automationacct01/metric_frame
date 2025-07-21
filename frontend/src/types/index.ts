// Type definitions for NIST CSF 2.0 Metrics Application

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
  LOW = 'low',
  MODERATE = 'moderate',
  ELEVATED = 'elevated',
  HIGH = 'high'
}

export interface Metric {
  id: string;
  name: string;
  description?: string;
  formula?: string;
  calc_expr_json?: any;
  csf_function: CSFFunction;
  csf_category_code?: string;
  csf_subcategory_code?: string;
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
  active: boolean;
  created_at: string;
  updated_at: string;
  metric_score?: number;
  gap_to_target?: number;
}

export interface MetricHistory {
  id: string;
  metric_id: string;
  collected_at: string;
  raw_value_json?: any;
  normalized_value?: number;
  source_ref?: string;
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
  function?: CSFFunction;
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
  mode: 'metrics' | 'explain' | 'report';
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
  [RiskRating.LOW]: '#4caf50',      // Green
  [RiskRating.MODERATE]: '#ff9800', // Orange
  [RiskRating.ELEVATED]: '#ff5722', // Deep Orange  
  [RiskRating.HIGH]: '#f44336'      // Red
};

export const PRIORITY_NAMES: Record<number, string> = {
  1: 'High',
  2: 'Medium', 
  3: 'Low'
};