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
  MetricVersionResponse,
  MetricVersionDiff,
  ScoresResponse,
  DashboardSummary,
  FunctionScore,
  AIChatRequest,
  AIResponse,
  AIAction,
  HealthResponse,
  Framework,
  FrameworkFunction,
  FrameworkScoresResponse,
  FrameworkCoverage,
  RecommendationsResponse,
  CoverageGaps,
  AIProvider,
  AIModel,
  AIConfiguration,
  AIConfigurationCreate,
  AIConfigurationUpdate,
  AIValidationResult,
  AIProviderStatus,
} from '../types';

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Determine the correct API base URL
    this.baseURL = this.determineBaseURL();
    
    if (import.meta.env.DEV) {
      console.log('🔧 Initializing API Client:', {
        baseURL: this.baseURL,
        environment: import.meta.env.NODE_ENV,
        viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        timestamp: new Date().toISOString(),
      });
    }
    
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
        
        if (import.meta.env.DEV) {
          console.log(`🚀 API Request: ${method} ${url}`, {
            fullUrl,
            method,
            baseURL: config.baseURL,
            timeout: config.timeout,
            timestamp: new Date().toISOString(),
          });
        }
        
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
        
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${method} ${url} (${response.status}) - ${duration}ms`, {
            status: response.status,
            statusText: response.statusText,
            duration,
            dataSize: JSON.stringify(response.data).length,
          });
        }
        
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
          timestamp: new Date().toISOString(),
        };

        if (import.meta.env.DEV) {
          console.error(`❌ API Response Error: ${method} ${url}`, errorInfo);

          if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
            console.error('🔌 Connection Error: Cannot reach the backend API server');
            console.error('💡 Troubleshooting tips:');
            console.error('   1. Check if backend is running on http://localhost:8002');
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
        if (import.meta.env.DEV) console.log(`🔄 ${operation} (attempt ${attempt}/${maxRetries})`);
        const result = await requestFn();
        if (attempt > 1 && import.meta.env.DEV) {
          console.log(`✅ ${operation} succeeded on retry attempt ${attempt}`);
        }
        return result;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const shouldRetry = this.shouldRetryRequest(error);

        if (shouldRetry && !isLastAttempt) {
          const delay = retryDelay * attempt;
          if (import.meta.env.DEV) {
            console.log(`⏳ ${operation} failed (attempt ${attempt}), retrying in ${delay}ms...`, {
              error: error.message,
              status: error.response?.status,
            });
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          if (import.meta.env.DEV) console.error(`❌ ${operation} failed after ${attempt} attempts:`, error);
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

    // Don't retry on 503 Service Unavailable (typically means AI provider not configured)
    if (error.response?.status === 503) {
      return false;
    }

    // Retry on network errors or server errors (5xx)
    return !error.response || error.response.status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK';
  }

  // Intelligently determine the correct API base URL
  private determineBaseURL(): string {
    // 0. Check for Electron/Desktop mode (file:// protocol)
    // When running as a desktop app, the frontend is loaded from file://
    // and the backend runs on localhost:8000
    if (window.location.protocol === 'file:') {
      const tlsEnabled = localStorage.getItem('metricframe_tls_enabled') === 'true';
      const protocol = tlsEnabled ? 'https' : 'http';
      const desktopApiUrl = `${protocol}://127.0.0.1:8000/api/v1`;
      if (import.meta.env.DEV) console.log(`🖥️ Desktop mode detected (file:// protocol, TLS: ${tlsEnabled}), using:`, desktopApiUrl);
      return desktopApiUrl;
    }

    // 1. For development, use Vite proxy (relative URL)
    const currentHost = window.location.hostname;
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Use relative URL to leverage Vite proxy configuration
      // This avoids CORS issues by making requests appear same-origin
      const proxyUrl = '/api/v1';
      if (import.meta.env.DEV) {
        console.log('🏠 Development environment: Using Vite proxy at', proxyUrl);
        console.log('🔧 Proxy will forward to backend container via Docker network');
      }
      return proxyUrl;
    }

    // 2. Check environment variable for production override
    if (import.meta.env.VITE_API_BASE_URL) {
      if (import.meta.env.DEV) console.log('🔗 Using API URL from environment:', import.meta.env.VITE_API_BASE_URL);
      return import.meta.env.VITE_API_BASE_URL;
    }

    // 3. Production fallback - assume API is on same host with /api/v1 path
    const currentProtocol = window.location.protocol;
    const prodApiUrl = `${currentProtocol}//${currentHost}/api/v1`;
    if (import.meta.env.DEV) console.log('🌐 Production environment assumed, using:', prodApiUrl);
    return prodApiUrl;
  }

  // Health check with retry logic
  async getHealth(): Promise<HealthResponse> {
    return this.makeRequest(
      async () => {
        // Health endpoint is at /health (not /api/v1/health)
        // For desktop mode, use absolute URL; for web, use relative
        const isDesktop = window.location.protocol === 'file:';
        const tlsEnabled = localStorage.getItem('metricframe_tls_enabled') === 'true';
        const protocol = tlsEnabled ? 'https' : 'http';
        const healthUrl = isDesktop
          ? `${protocol}://127.0.0.1:8000/health`
          : '/health';

        const healthResponse = await axios.get<HealthResponse>(healthUrl, {
          timeout: 10000,
        });
        return healthResponse.data;
      },
      'Health Check'
    );
  }

  // ==============================================================================
  // FRAMEWORK ENDPOINTS
  // ==============================================================================

  async getFrameworks(): Promise<Framework[]> {
    const response = await this.client.get<Framework[]>('/frameworks');
    return response.data;
  }

  async getFramework(code: string): Promise<Framework> {
    const response = await this.client.get<Framework>(`/frameworks/${code}`);
    return response.data;
  }

  async getFrameworkFunctions(frameworkCode: string): Promise<FrameworkFunction[]> {
    const response = await this.client.get<FrameworkFunction[]>(`/frameworks/${frameworkCode}/functions`);
    return response.data;
  }

  // Multi-framework scoring
  async getFrameworkScores(frameworkCode: string): Promise<FrameworkScoresResponse> {
    const response = await this.client.get<FrameworkScoresResponse>(`/scores/framework/${frameworkCode}`);
    return response.data;
  }

  async getFrameworkFunctionScores(frameworkCode: string): Promise<any[]> {
    const response = await this.client.get<any[]>(`/scores/framework/${frameworkCode}/functions`);
    return response.data;
  }

  async getFrameworkCategoryScores(frameworkCode: string, functionCode: string): Promise<any> {
    const response = await this.client.get(`/scores/framework/${frameworkCode}/functions/${functionCode}/categories`);
    return response.data;
  }

  async getFrameworkCoverage(frameworkCode: string): Promise<FrameworkCoverage> {
    const response = await this.client.get<FrameworkCoverage>(`/scores/framework/${frameworkCode}/coverage`);
    return response.data;
  }

  async getFrameworkAttentionMetrics(frameworkCode: string, limit = 10): Promise<any[]> {
    const response = await this.client.get<any[]>(`/scores/framework/${frameworkCode}/attention?limit=${limit}`);
    return response.data;
  }

  // ==============================================================================
  // METRICS ENDPOINTS
  // ==============================================================================

  async getMetrics(filters?: MetricFilters): Promise<MetricListResponse> {
    const params = new URLSearchParams();

    if (filters?.framework) params.append('framework', filters.framework);
    if (filters?.function) params.append('function', filters.function);
    if (filters?.function_code) params.append('function_code', filters.function_code);
    if (filters?.priority_rank) params.append('priority_rank', filters.priority_rank.toString());
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.owner_function) params.append('owner_function', filters.owner_function);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await this.client.get<MetricListResponse>(`/metrics/?${params.toString()}`);
    return response.data;
  }

  async getActiveCatalogMetrics(filters?: MetricFilters, owner = 'admin@example.com'): Promise<MetricListResponse> {
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
    const response = await this.client.patch<Metric>(`/metrics/${id}`, updates);
    return response.data;
  }

  async lockMetric(id: string, user = 'admin'): Promise<Metric> {
    const params = new URLSearchParams();
    if (user) params.append('locked_by', user);
    const response = await this.client.post<Metric>(`/metrics/${id}/lock?${params.toString()}`);
    return response.data;
  }

  async unlockMetric(id: string, user = 'admin'): Promise<Metric> {
    const params = new URLSearchParams();
    if (user) params.append('unlocked_by', user);
    const response = await this.client.post<Metric>(`/metrics/${id}/unlock?${params.toString()}`);
    return response.data;
  }

  async toggleMetricLock(id: string, user = 'admin'): Promise<Metric> {
    const params = new URLSearchParams();
    if (user) params.append('user', user);
    const response = await this.client.post<Metric>(`/metrics/${id}/toggle-lock?${params.toString()}`);
    return response.data;
  }

  async updateMetricField(id: string, field: string, value: any): Promise<any> {
    const params = new URLSearchParams();
    params.append('field', field);
    params.append('value', value !== null && value !== undefined ? String(value) : '');
    const response = await this.client.patch(`/metrics/${id}/field?${params.toString()}`);
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

  // ==============================================================================
  // METRIC VERSION ENDPOINTS
  // ==============================================================================

  async getMetricVersions(metricId: string, limit = 50, offset = 0): Promise<MetricVersionResponse[]> {
    const response = await this.client.get<MetricVersionResponse[]>(
      `/metrics/${metricId}/versions?limit=${limit}&offset=${offset}`
    );
    return response.data;
  }

  async getMetricVersion(metricId: string, versionNumber: number): Promise<MetricVersionResponse> {
    const response = await this.client.get<MetricVersionResponse>(
      `/metrics/${metricId}/versions/${versionNumber}`
    );
    return response.data;
  }

  async compareMetricVersions(
    metricId: string,
    versionA: number,
    versionB: number
  ): Promise<MetricVersionDiff> {
    const response = await this.client.get<MetricVersionDiff>(
      `/metrics/${metricId}/versions/diff?version_a=${versionA}&version_b=${versionB}`
    );
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

  // ==============================================================================
  // AI ASSISTANT ENDPOINTS
  // ==============================================================================

  async chatWithAI(request: AIChatRequest, framework = 'csf_2_0'): Promise<AIResponse> {
    const params = new URLSearchParams();
    params.append('framework', request.framework || framework);
    // Report generation can take longer - use 120 second timeout
    const timeout = request.mode === 'report' ? 120000 : 60000;
    const response = await this.client.post<AIResponse>(
      `/ai/chat?${params.toString()}`,
      request,
      { timeout }
    );
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

  async getAISuggestions(functionCode?: string, framework = 'csf_2_0'): Promise<any> {
    const params = new URLSearchParams();
    params.append('framework', framework);
    if (functionCode) params.append('function_code', functionCode);
    const response = await this.client.get(`/ai/suggest/improvements?${params.toString()}`);
    return response.data;
  }

  // AI Recommendations endpoints
  async getAIRecommendations(framework = 'csf_2_0', maxRecommendations = 10): Promise<RecommendationsResponse> {
    const params = new URLSearchParams();
    params.append('framework', framework);
    params.append('max_recommendations', maxRecommendations.toString());
    // AI recommendations can take a while to generate - use 90 second timeout
    const response = await this.client.post<RecommendationsResponse>(
      `/ai/recommendations?${params.toString()}`,
      {},
      { timeout: 90000 }
    );
    return response.data;
  }

  async getCoverageGaps(framework = 'csf_2_0'): Promise<CoverageGaps> {
    const params = new URLSearchParams();
    params.append('framework', framework);
    const response = await this.client.get<CoverageGaps>(`/ai/recommendations/gaps?${params.toString()}`);
    return response.data;
  }

  async suggestMetricsForGap(
    framework = 'csf_2_0',
    functionCode?: string,
    categoryCode?: string,
    count = 5
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append('framework', framework);
    if (functionCode) params.append('function_code', functionCode);
    if (categoryCode) params.append('category_code', categoryCode);
    params.append('count', count.toString());
    const response = await this.client.post(`/ai/recommendations/suggest?${params.toString()}`);
    return response.data;
  }

  async getMetricsDistribution(framework = 'csf_2_0'): Promise<any> {
    const params = new URLSearchParams();
    params.append('framework', framework);
    const response = await this.client.get(`/ai/recommendations/distribution?${params.toString()}`);
    return response.data;
  }

  // AI-powered metric generation from name
  async generateMetricFromName(metricName: string, framework = 'csf_2_0'): Promise<{
    success: boolean;
    metric: Partial<Metric>;
    message?: string;
    error?: string;
    raw_response?: string;
  }> {
    const params = new URLSearchParams();
    params.append('metric_name', metricName);
    params.append('framework', framework);
    const response = await this.client.post(`/ai/generate-metric?${params.toString()}`);
    return response.data;
  }

  // CSV Export with all filters
  async exportMetricsCSV(filters?: MetricFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.framework) params.append('framework', filters.framework);
    if (filters?.function) params.append('function', filters.function);
    if (filters?.function_code) params.append('function_code', filters.function_code);
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

  async uploadCatalog(
    file: File,
    catalogName: string,
    description?: string,
    owner?: string,
    framework = 'csf_2_0'
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('catalog_name', catalogName);
    formData.append('framework', framework);
    if (description) formData.append('description', description);
    if (owner) formData.append('owner', owner);

    const response = await this.client.post('/catalogs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getCatalogMappings(catalogId: string, framework = 'csf_2_0', signal?: AbortSignal): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('framework', framework);
    const response = await this.client.get<any[]>(`/catalogs/${catalogId}/mappings?${params.toString()}`, {
      timeout: 0, // No timeout - allow unlimited processing time
      signal // Support for cancellation
    });
    return response.data;
  }

  async enhanceCatalogMetrics(catalogId: string, framework = 'csf_2_0', signal?: AbortSignal): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('framework', framework);
    const response = await this.client.get<any[]>(`/catalogs/${catalogId}/enhancements?${params.toString()}`, {
      timeout: 0, // No timeout - allow unlimited processing time
      signal // Support for cancellation
    });
    return response.data;
  }

  async saveCatalogMappings(catalogId: string, mappings: any[]): Promise<any> {
    const response = await this.client.post(`/catalogs/${catalogId}/mappings`, mappings);
    return response.data;
  }

  async applyEnhancements(catalogId: string, enhancements: any[]): Promise<any> {
    const response = await this.client.post(`/catalogs/${catalogId}/enhancements/apply`, enhancements);
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

  async cloneDefaultCatalog(
    newName: string,
    description?: string,
    clearCurrentValues = true,
    owner = 'admin'
  ): Promise<{
    catalog_id: string;
    name: string;
    items_cloned: number;
    mappings_cloned: number;
    message: string;
  }> {
    const response = await this.client.post('/catalogs/clone-default', {
      new_name: newName,
      description,
      clear_current_values: clearCurrentValues,
      owner,
    });
    return response.data;
  }

  async cloneCatalog(
    catalogId: string,
    newName: string,
    description?: string,
    clearCurrentValues = true,
    owner = 'admin'
  ): Promise<{
    catalog_id: string;
    name: string;
    items_cloned: number;
    mappings_cloned: number;
    message: string;
  }> {
    const response = await this.client.post(`/catalogs/${catalogId}/clone`, {
      new_name: newName,
      description,
      clear_current_values: clearCurrentValues,
      owner,
    });
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

  // Export active catalog metrics to CSV
  async exportActiveCatalogMetricsCSV(filters?: MetricFilters, owner?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (filters?.function) params.append('function', filters.function);
    if (filters?.priority_rank) params.append('priority_rank', filters.priority_rank.toString());
    if (filters?.search) params.append('search', filters.search);

    const response = await this.client.get(`/catalogs/active/metrics/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // ==============================================================================
  // AI PROVIDER MANAGEMENT ENDPOINTS
  // ==============================================================================

  /**
   * Get all available AI providers with their models
   */
  async getAIProviders(): Promise<AIProvider[]> {
    const response = await this.client.get<{ providers: AIProvider[] }>('/ai-providers/');
    return response.data.providers;
  }

  /**
   * Get a specific AI provider by code
   */
  async getAIProvider(providerCode: string): Promise<AIProvider> {
    const response = await this.client.get<AIProvider>(`/ai-providers/${providerCode}`);
    return response.data;
  }

  /**
   * Get models for a specific provider
   */
  async getAIProviderModels(providerCode: string): Promise<AIModel[]> {
    const response = await this.client.get<AIModel[]>(`/ai-providers/${providerCode}/models`);
    return response.data;
  }

  /**
   * Get user's AI configurations
   */
  async getAIConfigurations(userId?: string): Promise<AIConfiguration[]> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    const response = await this.client.get<{ configurations: AIConfiguration[] }>(`/ai-providers/configurations?${params.toString()}`);
    return response.data.configurations;
  }

  /**
   * Create a new AI configuration
   */
  async createAIConfiguration(config: AIConfigurationCreate, userId?: string): Promise<AIConfiguration> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    const response = await this.client.post<AIConfiguration>(`/ai-providers/configurations?${params.toString()}`, config);
    return response.data;
  }

  /**
   * Update an existing AI configuration
   */
  async updateAIConfiguration(configId: string, updates: AIConfigurationUpdate): Promise<AIConfiguration> {
    const response = await this.client.put<AIConfiguration>(`/ai-providers/configurations/${configId}`, updates);
    return response.data;
  }

  /**
   * Delete an AI configuration
   */
  async deleteAIConfiguration(configId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/ai-providers/configurations/${configId}`);
    return response.data;
  }

  /**
   * Validate credentials for an AI configuration
   */
  async validateAIConfiguration(configId: string): Promise<AIValidationResult> {
    const response = await this.client.post<AIValidationResult>(`/ai-providers/configurations/${configId}/validate`);
    return response.data;
  }

  /**
   * Activate an AI configuration (set as active provider)
   */
  async activateAIConfiguration(configId: string): Promise<AIConfiguration> {
    const response = await this.client.post<AIConfiguration>(`/ai-providers/configurations/${configId}/activate`);
    return response.data;
  }

  /**
   * Discover models from a dynamic provider endpoint (e.g., local models)
   */
  async discoverProviderModels(providerCode: string): Promise<any[]> {
    const response = await this.client.get<any[]>(`/ai-providers/${providerCode}/discover-models`);
    return response.data;
  }

  /**
   * Get extended AI status including provider info
   */
  async getAIProviderStatus(): Promise<AIProviderStatus> {
    const response = await this.client.get<AIProviderStatus>('/ai/status');
    return response.data;
  }

  /**
   * Get web search configuration status
   */
  async getSearchConfig(): Promise<any> {
    const response = await this.client.get('/ai/search/config');
    return response.data;
  }

  // ==============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ==============================================================================

  /**
   * Get all users (admin only)
   */
  async getUsers(activeOnly = false, role?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (activeOnly) params.append('active_only', 'true');
    if (role) params.append('role', role);
    const response = await this.client.get<any[]>(`/users/?${params.toString()}`);
    return response.data;
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(userData: { name: string; email: string; role: string }): Promise<any> {
    const response = await this.client.post<any>('/users/', userData);
    return response.data;
  }

  /**
   * Get current user profile from X-User-Email header
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.client.get<any>('/users/me');
    return response.data;
  }

  /**
   * Get a user by ID (admin only)
   */
  async getUser(userId: string): Promise<any> {
    const response = await this.client.get<any>(`/users/${userId}`);
    return response.data;
  }

  /**
   * Update a user (admin only)
   */
  async updateUser(userId: string, updates: Record<string, any>): Promise<any> {
    const response = await this.client.put<any>(`/users/${userId}`, updates);
    return response.data;
  }

  /**
   * Soft delete (deactivate) a user (admin only)
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/users/${userId}`);
    return response.data;
  }

  /**
   * Assign a role to a user (admin only)
   */
  async assignUserRole(userId: string, role: string): Promise<any> {
    const response = await this.client.put<any>(`/users/${userId}/role`, { role });
    return response.data;
  }

  /**
   * Set the current user email header for all subsequent requests.
   * This is used for role-based access control.
   */
  setCurrentUserEmail(email: string | null): void {
    if (email) {
      this.client.defaults.headers.common['X-User-Email'] = email;
    } else {
      delete this.client.defaults.headers.common['X-User-Email'];
    }
  }

  /**
   * Set the authentication token for all subsequent requests.
   * Uses the standard Authorization: Bearer scheme.
   */
  setAuthToken(token: string | null): void {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }
}

// Create and export singleton instance
export const apiClient = new APIClient();
export default apiClient;