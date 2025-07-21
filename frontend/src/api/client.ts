// API client for NIST CSF 2.0 Metrics Application

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Metric,
  MetricListResponse,
  MetricFilters,
  MetricHistory,
  ScoresResponse,
  DashboardSummary,
  FunctionScore,
  AIChatRequest,
  AIResponse,
  AIAction,
  HealthResponse,
} from '../types';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  // Metrics endpoints
  async getMetrics(filters?: MetricFilters): Promise<MetricListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.function) params.append('function', filters.function);
    if (filters?.priority_rank) params.append('priority_rank', filters.priority_rank.toString());
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.owner_function) params.append('owner_function', filters.owner_function);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await this.client.get<MetricListResponse>(`/metrics?${params.toString()}`);
    return response.data;
  }

  async getMetric(id: string): Promise<Metric> {
    const response = await this.client.get<Metric>(`/metrics/${id}`);
    return response.data;
  }

  async createMetric(metric: Omit<Metric, 'id' | 'created_at' | 'updated_at'>): Promise<Metric> {
    const response = await this.client.post<Metric>('/metrics', metric);
    return response.data;
  }

  async updateMetric(id: string, updates: Partial<Metric>): Promise<Metric> {
    const response = await this.client.put<Metric>(`/metrics/${id}`, updates);
    return response.data;
  }

  async patchMetric(id: string, updates: Partial<Metric>): Promise<Metric> {
    const response = await this.client.patch<Metric>(`/metrics/${id}`, updates);
    return response.data;
  }

  async deleteMetric(id: string, hardDelete = false): Promise<{ message: string }> {
    const params = hardDelete ? '?hard_delete=true' : '';
    const response = await this.client.delete<{ message: string }>(`/metrics/${id}${params}`);
    return response.data;
  }

  async addMetricValue(id: string, history: Omit<MetricHistory, 'id' | 'metric_id'>): Promise<MetricHistory> {
    const response = await this.client.post<MetricHistory>(`/metrics/${id}/values`, history);
    return response.data;
  }

  async getMetricHistory(id: string, limit = 50, offset = 0): Promise<MetricHistory[]> {
    const response = await this.client.get<MetricHistory[]>(`/metrics/${id}/history?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async getCSFFunctions(): Promise<any> {
    const response = await this.client.get('/metrics/functions/list');
    return response.data;
  }

  async getMetricsSummary(): Promise<any> {
    const response = await this.client.get('/metrics/stats/summary');
    return response.data;
  }

  // Scores endpoints
  async getScores(): Promise<ScoresResponse> {
    const response = await this.client.get<ScoresResponse>('/scores');
    return response.data;
  }

  async getFunctionScore(functionCode: string): Promise<FunctionScore> {
    const response = await this.client.get<FunctionScore>(`/scores/functions/${functionCode}`);
    return response.data;
  }

  async getMetricsNeedingAttention(limit = 10): Promise<any[]> {
    const response = await this.client.get<any[]>(`/scores/metrics/attention?limit=${limit}`);
    return response.data;
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await this.client.get<DashboardSummary>('/scores/dashboard/summary');
    return response.data;
  }

  async getFunctionTrend(functionCode: string, days = 30): Promise<any> {
    const response = await this.client.get(`/scores/trends/function/${functionCode}?days=${days}`);
    return response.data;
  }

  async recalculateScores(): Promise<any> {
    const response = await this.client.post('/scores/recalculate');
    return response.data;
  }

  async getRiskThresholds(): Promise<any> {
    const response = await this.client.get('/scores/thresholds');
    return response.data;
  }

  // AI Assistant endpoints
  async chatWithAI(request: AIChatRequest): Promise<AIResponse> {
    const response = await this.client.post<AIResponse>('/ai/chat', request);
    return response.data;
  }

  async applyAIActions(actions: AIAction[], userConfirmation = true): Promise<any> {
    const response = await this.client.post('/ai/actions/apply', {
      actions,
      user_confirmation: userConfirmation,
    });
    return response.data;
  }

  async getAIHistory(limit = 50, offset = 0, appliedOnly = false): Promise<any[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      applied_only: appliedOnly.toString(),
    });
    
    const response = await this.client.get<any[]>(`/ai/history?${params.toString()}`);
    return response.data;
  }

  async getAIStatus(): Promise<any> {
    const response = await this.client.get('/ai/status');
    return response.data;
  }

  async getAISuggestions(functionCode?: string): Promise<any> {
    const params = functionCode ? `?function_code=${functionCode}` : '';
    const response = await this.client.get(`/ai/suggest/improvements${params}`);
    return response.data;
  }

  // CSV Import/Export (future implementation)
  async exportMetricsCSV(filters?: MetricFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.function) params.append('function', filters.function);
    if (filters?.priority_rank) params.append('priority_rank', filters.priority_rank.toString());
    if (filters?.active !== undefined) params.append('active', filters.active.toString());

    const response = await this.client.get(`/metrics/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async importMetricsCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/metrics/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

// Create and export singleton instance
export const apiClient = new APIClient();
export default apiClient;