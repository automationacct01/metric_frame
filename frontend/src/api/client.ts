// API client for NIST CSF 2.0 Metrics Application

import axios, { AxiosInstance } from 'axios';

// Extend AxiosRequestConfig to include our custom metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}
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
  private baseURL: string;

  constructor() {
    // Determine the correct API base URL
    this.baseURL = this.determineBaseURL();
    
    console.log('🔧 Initializing API Client:', {
      baseURL: this.baseURL,
      environment: import.meta.env.NODE_ENV,
      viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      timestamp: new Date().toISOString(),
    });
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor with enhanced logging
    this.client.interceptors.request.use(
      (config) => {
        const method = config.method?.toUpperCase();
        const url = config.url;
        const fullUrl = `${config.baseURL}${url}`;
        
        console.log(`🚀 API Request: ${method} ${url}`, {
          fullUrl,
          method,
          baseURL: config.baseURL,
          timeout: config.timeout,
          timestamp: new Date().toISOString(),
        });
        
        // Add request timestamp for performance tracking
        config.metadata = { startTime: Date.now() };
        
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with enhanced error handling
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        const method = response.config.method?.toUpperCase();
        const url = response.config.url;
        
        console.log(`✅ API Response: ${method} ${url} (${response.status}) - ${duration}ms`, {
          status: response.status,
          statusText: response.statusText,
          duration,
          dataSize: JSON.stringify(response.data).length,
        });
        
        return response;
      },
      (error) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);
        const method = error.config?.method?.toUpperCase();
        const url = error.config?.url;
        const fullUrl = `${error.config?.baseURL}${url}`;
        
        // Enhanced error logging
        const errorInfo = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          method,
          url,
          fullUrl,
          duration,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout,
          responseData: error.response?.data,
          timestamp: new Date().toISOString(),
        };

        console.error(`❌ API Response Error: ${method} ${url}`, errorInfo);
        
        // Add connection-specific error messages
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          console.error('🔌 Connection Error: Cannot reach the backend API server');
          console.error('💡 Troubleshooting tips:');
          console.error('   1. Check if backend is running on http://localhost:8000');
          console.error('   2. Verify CORS settings allow requests from this origin');
          console.error('   3. Check if database is connected and running');
        }

        if (error.response?.status === 404) {
          console.error('🔍 Not Found: The requested API endpoint does not exist');
          console.error(`   Expected URL: ${fullUrl}`);
        }

        if (error.response?.status >= 500) {
          console.error('🔥 Server Error: Backend API encountered an internal error');
          console.error('   Check backend logs for more details');
        }

        return Promise.reject(error);
      }
    );
  }


  // Enhanced method with retry logic
  private async makeRequest<T>(requestFn: () => Promise<T>, operation: string): Promise<T> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 ${operation} (attempt ${attempt}/${maxRetries})`);
        const result = await requestFn();
        if (attempt > 1) {
          console.log(`✅ ${operation} succeeded on retry attempt ${attempt}`);
        }
        return result;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const shouldRetry = this.shouldRetryRequest(error);

        if (shouldRetry && !isLastAttempt) {
          const delay = retryDelay * attempt;
          console.log(`⏳ ${operation} failed (attempt ${attempt}), retrying in ${delay}ms...`, {
            error: error.message,
            status: error.response?.status,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`❌ ${operation} failed after ${attempt} attempts:`, error);
          throw error;
        }
      }
    }

    throw new Error(`${operation} failed after ${maxRetries} attempts`);
  }

  private shouldRetryRequest(error: any): boolean {
    // Don't retry on client errors (4xx) except for 408 (timeout) and 429 (rate limit)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return error.response.status === 408 || error.response.status === 429;
    }

    // Retry on network errors or server errors (5xx)
    return !error.response || error.response.status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK';
  }

  // Intelligently determine the correct API base URL
  private determineBaseURL(): string {
    // 1. For development, use Vite proxy (relative URL)
    const currentHost = window.location.hostname;
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Use relative URL to leverage Vite proxy configuration
      // This avoids CORS issues by making requests appear same-origin
      const proxyUrl = '/api/v1';
      console.log('🏠 Development environment: Using Vite proxy at', proxyUrl);
      console.log('🔧 Proxy will forward to backend container via Docker network');
      return proxyUrl;
    }

    // 2. Check environment variable for production override
    if (import.meta.env.VITE_API_BASE_URL) {
      console.log('🔗 Using API URL from environment:', import.meta.env.VITE_API_BASE_URL);
      return import.meta.env.VITE_API_BASE_URL;
    }

    // 3. Production fallback - assume API is on same host with /api/v1 path
    const currentProtocol = window.location.protocol;
    const prodApiUrl = `${currentProtocol}//${currentHost}/api/v1`;
    console.log('🌐 Production environment assumed, using:', prodApiUrl);
    return prodApiUrl;
  }

  // Health check with retry logic
  async getHealth(): Promise<HealthResponse> {
    return this.makeRequest(
      async () => {
        // Note: Health endpoint is at /health (not /api/v1/health)
        // Create a temporary client without the baseURL for this specific call
        const healthResponse = await axios.get<HealthResponse>('/health', {
          timeout: 10000,
        });
        return healthResponse.data;
      },
      'Health Check'
    );
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

    const response = await this.client.get<MetricListResponse>(`/metrics/?${params.toString()}`);
    return response.data;
  }

  async getActiveCatalogMetrics(filters?: MetricFilters, owner = 'admin'): Promise<MetricListResponse> {
    const params = new URLSearchParams();
    params.append('owner', owner);
    
    if (filters?.function) params.append('function', filters.function);
    if (filters?.priority_rank) params.append('priority_rank', filters.priority_rank.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    try {
      const response = await this.client.get<MetricListResponse>(`/catalogs/active/metrics?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No active catalog found, return empty result
        return {
          items: [],
          total: 0,
          limit: filters?.limit || 100,
          offset: filters?.offset || 0,
          has_more: false
        };
      }
      throw error;
    }
  }

  async getMetric(id: string): Promise<Metric> {
    const response = await this.client.get<Metric>(`/metrics/${id}/`);
    return response.data;
  }

  async createMetric(metric: Omit<Metric, 'id' | 'created_at' | 'updated_at'>): Promise<Metric> {
    const response = await this.client.post<Metric>('/metrics/', metric);
    return response.data;
  }

  async updateMetric(id: string, updates: Partial<Metric>): Promise<Metric> {
    const response = await this.client.put<Metric>(`/metrics/${id}/`, updates);
    return response.data;
  }

  async patchMetric(id: string, updates: Partial<Metric>): Promise<Metric> {
    const response = await this.client.patch<Metric>(`/metrics/${id}/`, updates);
    return response.data;
  }

  async deleteMetric(id: string, hardDelete = false): Promise<{ message: string }> {
    const params = hardDelete ? '?hard_delete=true' : '';
    const response = await this.client.delete<{ message: string }>(`/metrics/${id}/${params}`);
    return response.data;
  }

  async addMetricValue(id: string, history: Omit<MetricHistory, 'id' | 'metric_id'>): Promise<MetricHistory> {
    const response = await this.client.post<MetricHistory>(`/metrics/${id}/values/`, history);
    return response.data;
  }

  async getMetricHistory(id: string, limit = 50, offset = 0): Promise<MetricHistory[]> {
    const response = await this.client.get<MetricHistory[]>(`/metrics/${id}/history/?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async getCSFFunctions(): Promise<any> {
    const response = await this.client.get('/metrics/functions/list/');
    return response.data;
  }

  async getMetricsSummary(): Promise<any> {
    const response = await this.client.get('/metrics/stats/summary/');
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
    return this.makeRequest(
      async () => {
        const response = await this.client.get<DashboardSummary>('/scores/dashboard/summary');
        return response.data;
      },
      'Dashboard Summary Fetch'
    );
  }

  async getFunctionTrend(functionCode: string, days = 30): Promise<any> {
    const response = await this.client.get(`/scores/trends/function/${functionCode}?days=${days}`);
    return response.data;
  }

  async getFunctionCategories(functionCode: string): Promise<any> {
    const response = await this.client.get(`/scores/functions/${functionCode}/categories`);
    return response.data;
  }

  async getCategoryDetails(categoryCode: string): Promise<any> {
    const response = await this.client.get(`/scores/categories/${categoryCode}`);
    return response.data;
  }

  async recalculateScores(): Promise<any> {
    return this.makeRequest(
      async () => {
        const response = await this.client.post('/scores/recalculate');
        return response.data;
      },
      'Score Recalculation'
    );
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

  // CSV Export with all filters
  async exportMetricsCSV(filters?: MetricFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.function) params.append('function', filters.function);
    if (filters?.category_code) params.append('category_code', filters.category_code);
    if (filters?.subcategory_code) params.append('subcategory_code', filters.subcategory_code);
    if (filters?.priority_rank) params.append('priority_rank', filters.priority_rank.toString());
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.owner_function) params.append('owner_function', filters.owner_function);

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

  // Catalog endpoints
  async getCatalogs(owner?: string, activeOnly = false): Promise<any[]> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (activeOnly) params.append('active_only', 'true');

    const response = await this.client.get<any[]>(`/catalogs/?${params.toString()}`);
    return response.data;
  }

  async getCatalog(catalogId: string): Promise<any> {
    const response = await this.client.get(`/catalogs/${catalogId}`);
    return response.data;
  }

  async uploadCatalog(file: File, catalogName: string, description?: string, owner?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('catalog_name', catalogName);
    if (description) formData.append('description', description);
    if (owner) formData.append('owner', owner);

    const response = await this.client.post('/catalogs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getCatalogMappings(catalogId: string, signal?: AbortSignal): Promise<any[]> {
    const response = await this.client.get<any[]>(`/catalogs/${catalogId}/mappings`, {
      timeout: 0, // No timeout - allow unlimited processing time
      signal // Support for cancellation
    });
    return response.data;
  }

  async enhanceCatalogMetrics(catalogId: string, signal?: AbortSignal): Promise<any[]> {
    const response = await this.client.get<any[]>(`/catalogs/${catalogId}/enhancements`, {
      timeout: 0, // No timeout - allow unlimited processing time
      signal // Support for cancellation
    });
    return response.data;
  }

  async saveCatalogMappings(catalogId: string, mappings: any[]): Promise<any> {
    const response = await this.client.post(`/catalogs/${catalogId}/mappings`, mappings);
    return response.data;
  }

  async activateCatalog(catalogId: string, activate = true): Promise<any> {
    const response = await this.client.post(`/catalogs/${catalogId}/activate`, { activate });
    return response.data;
  }

  async deleteCatalog(catalogId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/catalogs/${catalogId}`);
    return response.data;
  }

  // Catalog-aware scoring methods
  async getScoresWithCatalog(catalogId?: string, owner?: string): Promise<ScoresResponse> {
    const params = new URLSearchParams();
    if (catalogId) params.append('catalog_id', catalogId);
    if (owner) params.append('owner', owner);

    const response = await this.client.get<ScoresResponse>(`/scores?${params.toString()}`);
    return response.data;
  }

  async getDashboardSummaryWithCatalog(catalogId?: string, owner?: string): Promise<DashboardSummary> {
    return this.makeRequest(
      async () => {
        const params = new URLSearchParams();
        if (catalogId) params.append('catalog_id', catalogId);
        if (owner) params.append('owner', owner);

        const response = await this.client.get<DashboardSummary>(`/scores/dashboard/summary?${params.toString()}`);
        return response.data;
      },
      'Dashboard Summary with Catalog Fetch'
    );
  }

  async getFunctionCategoriesWithCatalog(functionCode: string, catalogId?: string, owner?: string): Promise<any> {
    const params = new URLSearchParams();
    if (catalogId) params.append('catalog_id', catalogId);
    if (owner) params.append('owner', owner);

    const response = await this.client.get(`/scores/functions/${functionCode}/categories?${params.toString()}`);
    return response.data;
  }
}

// Create and export singleton instance
export const apiClient = new APIClient();
export default apiClient;