/**
 * Demo Context for managing demo mode state across the application.
 *
 * This context provides:
 * - Demo session state and quotas
 * - Demo mode detection
 * - Session management actions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../api/client';

// Demo types
export interface DemoQuotas {
  csf_metrics_created: number;
  csf_metrics_max: number;
  ai_rmf_metrics_created: number;
  ai_rmf_metrics_max: number;
}

export interface DemoSession {
  id: string;
  session_id: string;
  email: string;
  video_skipped: boolean;
  demo_started_at: string | null;
  demo_expires_at: string | null;
  expired: boolean;
  quotas: DemoQuotas;
  created_at: string;
}

// Context state type
interface DemoContextState {
  // Demo state
  isDemo: boolean;
  isDemoStarted: boolean;
  isDemoExpired: boolean;
  sessionId: string | null;
  session: DemoSession | null;

  // Quotas
  quotas: DemoQuotas;
  canCreateCsfMetric: boolean;
  canCreateAiRmfMetric: boolean;

  // Expiration
  expiresAt: Date | null;
  timeRemaining: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  createSession: (email: string) => Promise<DemoSession>;
  startDemo: (videoSkipped?: boolean) => Promise<void>;
  refreshSession: () => Promise<void>;
  incrementQuota: (framework: 'csf_2_0' | 'ai_rmf') => void;
  clearDemo: () => void;
}

// Default quotas
const DEFAULT_QUOTAS: DemoQuotas = {
  csf_metrics_created: 0,
  csf_metrics_max: 2,
  ai_rmf_metrics_created: 0,
  ai_rmf_metrics_max: 2,
};

// Default context value
const defaultContextValue: DemoContextState = {
  isDemo: false,
  isDemoStarted: false,
  isDemoExpired: false,
  sessionId: null,
  session: null,
  quotas: DEFAULT_QUOTAS,
  canCreateCsfMetric: true,
  canCreateAiRmfMetric: true,
  expiresAt: null,
  timeRemaining: null,
  isLoading: false,
  error: null,
  createSession: async () => { throw new Error('DemoContext not initialized'); },
  startDemo: async () => {},
  refreshSession: async () => {},
  incrementQuota: () => {},
  clearDemo: () => {},
};

// Create context
const DemoContext = createContext<DemoContextState>(defaultContextValue);

// Local storage keys
const DEMO_STORAGE_KEYS = {
  SESSION_ID: 'metricframe_demo_session_id',
  SESSION_DATA: 'metricframe_demo_session_data',
};

// Provider props
interface DemoProviderProps {
  children: ReactNode;
}

// Calculate time remaining string
function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

// Provider component
export function DemoProvider({ children }: DemoProviderProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Computed values
  const isDemo = !!sessionId;
  const isDemoStarted = !!session?.demo_started_at;
  const isDemoExpired = session?.expired ?? false;
  const quotas = session?.quotas ?? DEFAULT_QUOTAS;
  const canCreateCsfMetric = quotas.csf_metrics_created < quotas.csf_metrics_max;
  const canCreateAiRmfMetric = quotas.ai_rmf_metrics_created < quotas.ai_rmf_metrics_max;
  const expiresAt = session?.demo_expires_at ? new Date(session.demo_expires_at) : null;

  // Load session from localStorage on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem(DEMO_STORAGE_KEYS.SESSION_ID);
    const storedSessionData = localStorage.getItem(DEMO_STORAGE_KEYS.SESSION_DATA);

    if (storedSessionId) {
      setSessionId(storedSessionId);
      if (storedSessionData) {
        try {
          const parsedSession = JSON.parse(storedSessionData);
          setSession(parsedSession);
        } catch (e) {
          console.error('Failed to parse stored demo session:', e);
        }
      }
    }
  }, []);

  // Update time remaining every minute
  useEffect(() => {
    if (!expiresAt || isDemoExpired) {
      setTimeRemaining(null);
      return;
    }

    const updateTime = () => {
      setTimeRemaining(formatTimeRemaining(expiresAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt, isDemoExpired]);

  // Create demo session
  const createSession = useCallback(async (email: string): Promise<DemoSession> => {
    setIsLoading(true);
    setError(null);

    try {
      const newSession = await apiClient.createDemoSession(email);

      // Store in state and localStorage
      setSessionId(newSession.session_id);
      setSession(newSession);
      localStorage.setItem(DEMO_STORAGE_KEYS.SESSION_ID, newSession.session_id);
      localStorage.setItem(DEMO_STORAGE_KEYS.SESSION_DATA, JSON.stringify(newSession));

      return newSession;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to create demo session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start demo (after video)
  const startDemo = useCallback(async (videoSkipped = false): Promise<void> => {
    if (!sessionId) {
      throw new Error('No demo session');
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedSession = await apiClient.startDemoSession(sessionId, videoSkipped);

      setSession(updatedSession);
      localStorage.setItem(DEMO_STORAGE_KEYS.SESSION_DATA, JSON.stringify(updatedSession));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to start demo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Refresh session from server
  const refreshSession = useCallback(async (): Promise<void> => {
    if (!sessionId) return;

    try {
      const updatedSession = await apiClient.getDemoSession(sessionId);

      setSession(updatedSession);
      localStorage.setItem(DEMO_STORAGE_KEYS.SESSION_DATA, JSON.stringify(updatedSession));

      if (updatedSession.expired) {
        // Session expired, clear demo mode
        clearDemo();
      }
    } catch (err: any) {
      console.error('Failed to refresh demo session:', err);
      if (err.response?.status === 404) {
        // Session not found, clear demo mode
        clearDemo();
      }
    }
  }, [sessionId]);

  // Increment quota locally (after successful metric creation)
  const incrementQuota = useCallback((framework: 'csf_2_0' | 'ai_rmf'): void => {
    if (!session) return;

    const updatedQuotas = { ...session.quotas };
    if (framework === 'csf_2_0') {
      updatedQuotas.csf_metrics_created += 1;
    } else {
      updatedQuotas.ai_rmf_metrics_created += 1;
    }

    const updatedSession = { ...session, quotas: updatedQuotas };
    setSession(updatedSession);
    localStorage.setItem(DEMO_STORAGE_KEYS.SESSION_DATA, JSON.stringify(updatedSession));
  }, [session]);

  // Clear demo mode
  const clearDemo = useCallback((): void => {
    setSessionId(null);
    setSession(null);
    setError(null);
    localStorage.removeItem(DEMO_STORAGE_KEYS.SESSION_ID);
    localStorage.removeItem(DEMO_STORAGE_KEYS.SESSION_DATA);
  }, []);

  const value: DemoContextState = {
    isDemo,
    isDemoStarted,
    isDemoExpired,
    sessionId,
    session,
    quotas,
    canCreateCsfMetric,
    canCreateAiRmfMetric,
    expiresAt,
    timeRemaining,
    isLoading,
    error,
    createSession,
    startDemo,
    refreshSession,
    incrementQuota,
    clearDemo,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

// Hook to use demo context
export function useDemo(): DemoContextState {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}

// Export context for testing
export { DemoContext };
