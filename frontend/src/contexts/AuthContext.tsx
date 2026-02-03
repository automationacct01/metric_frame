/**
 * Authentication Context - Manages user login state across the app
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  active: boolean;
}

interface RegisterResult {
  recovery_key?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasUsers: boolean | null; // null = loading, true/false = known state
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    securityQuestion1?: string,
    securityAnswer1?: string,
    securityQuestion2?: string,
    securityAnswer2?: string
  ) => Promise<RegisterResult | void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'metricframe_auth_token';
const AUTH_USER_KEY = 'metricframe_auth_user';
// Use relative path for Vite proxy in development
// VITE_API_BASE_URL includes /api/v1, so strip it for auth endpoints
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // Remove /api/v1 suffix if present since we add it in fetch calls
    return envUrl.replace(/\/api\/v1\/?$/, '');
  }
  return '';
};
const API_BASE = getApiBase();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  // Check if any users exist and validate stored token
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if system has any users
        const statusResponse = await fetch(`${API_BASE}/api/v1/auth/status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setHasUsers(statusData.has_users);
        }

        // Validate stored token if exists
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = localStorage.getItem(AUTH_USER_KEY);

        if (storedToken && storedUser) {
          // Validate token using Authorization header (more secure than URL query)
          const response = await fetch(`${API_BASE}/api/v1/auth/validate`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(storedToken);
            apiClient.setAuthToken(storedToken);
            apiClient.setCurrentUserEmail(data.user.email);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
    setHasUsers(true);
    apiClient.setAuthToken(data.token);
    apiClient.setCurrentUserEmail(data.user.email);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    securityQuestion1?: string,
    securityAnswer1?: string,
    securityQuestion2?: string,
    securityAnswer2?: string
  ): Promise<RegisterResult | void> => {
    const body: Record<string, string> = { name, email, password };

    // Add security questions if provided (for first admin)
    if (securityQuestion1) body.security_question_1 = securityQuestion1;
    if (securityAnswer1) body.security_answer_1 = securityAnswer1;
    if (securityQuestion2) body.security_question_2 = securityQuestion2;
    if (securityAnswer2) body.security_answer_2 = securityAnswer2;

    const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
    setHasUsers(true);
    apiClient.setAuthToken(data.token);
    apiClient.setCurrentUserEmail(data.user.email);

    // Return recovery key if present (for first admin)
    if (data.recovery_key) {
      return { recovery_key: data.recovery_key };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem('userEmail');
    setUser(null);
    setToken(null);
    apiClient.setAuthToken(null);
    apiClient.setCurrentUserEmail(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    hasUsers,
    login,
    register,
    logout,
    isAdmin: user?.role === 'admin',
    isEditor: user?.role === 'editor' || user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
