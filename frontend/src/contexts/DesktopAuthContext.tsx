/**
 * Desktop Authentication Context
 *
 * Provides simplified authentication state management for the desktop app.
 * Supports two modes:
 * 1. Password protection - Simple password + security questions for recovery
 * 2. No authentication - Direct access to the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// API base URL for desktop
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

// ==============================================================================
// TYPES
// ==============================================================================

export type AuthMode = 'password' | 'none';

interface DesktopStatus {
  setup_completed: boolean;
  auth_mode: AuthMode;
  is_desktop_mode: boolean;
}

interface SetupOptions {
  password?: string;
  security_question_1?: string;
  security_answer_1?: string;
  security_question_2?: string;
  security_answer_2?: string;
}

interface ChangeModeOptions {
  current_password?: string;
  new_password?: string;
  security_question_1?: string;
  security_answer_1?: string;
  security_question_2?: string;
  security_answer_2?: string;
}

interface RecoveryQuestions {
  question_1: string;
  question_2: string;
}

interface DesktopAuthContextType {
  // State
  isDesktopMode: boolean;
  setupCompleted: boolean;
  authMode: AuthMode | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkStatus: () => Promise<void>;
  completeSetup: (mode: AuthMode, options?: SetupOptions) => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => void;
  getRecoveryQuestions: () => Promise<RecoveryQuestions>;
  resetPassword: (answer1: string, answer2: string, newPassword: string) => Promise<void>;
  changeAuthMode: (newMode: AuthMode, options?: ChangeModeOptions) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

// ==============================================================================
// CONTEXT
// ==============================================================================

const DesktopAuthContext = createContext<DesktopAuthContextType | undefined>(undefined);

// Session token storage key
const TOKEN_KEY = 'desktop_session_token';

// ==============================================================================
// PROVIDER
// ==============================================================================

interface DesktopAuthProviderProps {
  children: ReactNode;
}

export function DesktopAuthProvider({ children }: DesktopAuthProviderProps) {
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're running in desktop mode (file:// protocol or env flag)
  const detectDesktopMode = useCallback(() => {
    return window.location.protocol === 'file:' ||
           import.meta.env.VITE_DESKTOP_MODE === 'true';
  }, []);

  // Clear any error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check desktop status from API
  const checkStatus = useCallback(async () => {
    if (!detectDesktopMode()) {
      setIsDesktopMode(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/desktop/status`);
      if (!response.ok) {
        if (response.status === 404) {
          // Desktop endpoints not available (running in Docker mode)
          setIsDesktopMode(false);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to check desktop status');
      }

      const data: DesktopStatus = await response.json();
      setIsDesktopMode(data.is_desktop_mode);
      setSetupCompleted(data.setup_completed);
      setAuthMode(data.auth_mode);

      // Check for existing session token if password mode
      if (data.auth_mode === 'password') {
        const token = localStorage.getItem(TOKEN_KEY);
        setIsAuthenticated(!!token);
      } else if (data.auth_mode === 'none' && data.setup_completed) {
        // No auth mode = always authenticated after setup
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Desktop status check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  }, [detectDesktopMode]);

  // Complete initial setup
  const completeSetup = useCallback(async (mode: AuthMode, options?: SetupOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/desktop/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_mode: mode,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Setup failed');
      }

      setSetupCompleted(true);
      setAuthMode(mode);

      // If no auth mode, user is automatically authenticated
      if (mode === 'none') {
        setIsAuthenticated(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login with password
  const login = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/desktop/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Invalid password');
      }

      const data = await response.json();
      if (data.valid && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setIsAuthenticated(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
  }, []);

  // Get recovery questions
  const getRecoveryQuestions = useCallback(async (): Promise<RecoveryQuestions> => {
    const response = await fetch(`${API_BASE}/auth/desktop/recovery-questions`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get recovery questions');
    }
    return response.json();
  }, []);

  // Reset password using security questions
  const resetPassword = useCallback(async (answer1: string, answer2: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/desktop/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_1: answer1,
          answer_2: answer2,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Password reset failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Change authentication mode
  const changeAuthMode = useCallback(async (newMode: AuthMode, options?: ChangeModeOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/desktop/change-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_mode: newMode,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change mode');
      }

      setAuthMode(newMode);

      // Update authentication state
      if (newMode === 'none') {
        localStorage.removeItem(TOKEN_KEY);
        setIsAuthenticated(true);
      } else {
        // After switching to password mode, user stays authenticated
        // (they just set up their password)
        setIsAuthenticated(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change mode');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/desktop/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial status check on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const value: DesktopAuthContextType = {
    isDesktopMode,
    setupCompleted,
    authMode,
    isAuthenticated,
    isLoading,
    error,
    checkStatus,
    completeSetup,
    login,
    logout,
    getRecoveryQuestions,
    resetPassword,
    changeAuthMode,
    changePassword,
    clearError,
  };

  return (
    <DesktopAuthContext.Provider value={value}>
      {children}
    </DesktopAuthContext.Provider>
  );
}

// ==============================================================================
// HOOK
// ==============================================================================

export function useDesktopAuth() {
  const context = useContext(DesktopAuthContext);
  if (context === undefined) {
    throw new Error('useDesktopAuth must be used within a DesktopAuthProvider');
  }
  return context;
}
