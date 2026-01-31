/**
 * Framework Context for managing the selected framework across the application.
 *
 * This context provides:
 * - Current selected framework state
 * - Framework selection functionality
 * - List of available frameworks
 * - Onboarding state management
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Framework types
export interface Framework {
  id: string;
  code: string;
  name: string;
  version: string;
  description: string;
  source_url?: string;
  active: boolean;
  is_extension: boolean;
}

export interface FrameworkFunction {
  id: string;
  framework_id: string;
  code: string;
  name: string;
  description: string;
  display_order: number;
  color_hex?: string;
  icon_name?: string;
}

// Onboarding step type
export type OnboardingStep = 'framework' | 'apikey' | 'complete';

// Context state type
interface FrameworkContextState {
  // Current selection
  selectedFramework: Framework | null;
  selectedFrameworkId: string | null;

  // Available frameworks
  frameworks: Framework[];
  isLoadingFrameworks: boolean;
  frameworksError: string | null;

  // Onboarding state
  onboardingCompleted: boolean;
  showOnboarding: boolean;
  onboardingStep: OnboardingStep;
  apiKeyConfigured: boolean;

  // Actions
  selectFramework: (framework: Framework) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setApiKeyConfigured: (configured: boolean) => void;
  refreshFrameworks: () => Promise<void>;
}

// Default context value
const defaultContextValue: FrameworkContextState = {
  selectedFramework: null,
  selectedFrameworkId: null,
  frameworks: [],
  isLoadingFrameworks: false,
  frameworksError: null,
  onboardingCompleted: false,
  showOnboarding: true,
  onboardingStep: 'framework',
  apiKeyConfigured: false,
  selectFramework: () => {},
  setOnboardingCompleted: () => {},
  setOnboardingStep: () => {},
  setApiKeyConfigured: () => {},
  refreshFrameworks: async () => {},
};

// Create context
const FrameworkContext = createContext<FrameworkContextState>(defaultContextValue);

// Local storage keys
const STORAGE_KEYS = {
  SELECTED_FRAMEWORK_ID: 'metricframe_selected_framework_id',
  ONBOARDING_COMPLETED: 'metricframe_onboarding_completed',
  ONBOARDING_STEP: 'metricframe_onboarding_step',
  API_KEY_CONFIGURED: 'metricframe_api_key_configured',
};

// Provider props
interface FrameworkProviderProps {
  children: ReactNode;
}

// Provider component
export function FrameworkProvider({ children }: FrameworkProviderProps) {
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [isLoadingFrameworks, setIsLoadingFrameworks] = useState(true);
  const [frameworksError, setFrameworksError] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompletedState] = useState(false);
  const [onboardingStep, setOnboardingStepState] = useState<OnboardingStep>('framework');
  const [apiKeyConfigured, setApiKeyConfiguredState] = useState(false);

  // Load initial state from localStorage
  useEffect(() => {
    const storedOnboardingCompleted = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    if (storedOnboardingCompleted === 'true') {
      setOnboardingCompletedState(true);
    }

    const storedOnboardingStep = localStorage.getItem(STORAGE_KEYS.ONBOARDING_STEP);
    if (storedOnboardingStep) {
      setOnboardingStepState(storedOnboardingStep as OnboardingStep);
    }

    const storedApiKeyConfigured = localStorage.getItem(STORAGE_KEYS.API_KEY_CONFIGURED);
    if (storedApiKeyConfigured === 'true') {
      setApiKeyConfiguredState(true);
    }
  }, []);

  // Fetch available frameworks
  const fetchFrameworks = async () => {
    setIsLoadingFrameworks(true);
    setFrameworksError(null);

    try {
      const response = await fetch('/api/v1/frameworks');
      if (!response.ok) {
        throw new Error('Failed to fetch frameworks');
      }
      const data = await response.json();
      setFrameworks(data);

      // If we have a stored framework ID, try to restore selection
      const storedFrameworkId = localStorage.getItem(STORAGE_KEYS.SELECTED_FRAMEWORK_ID);
      if (storedFrameworkId) {
        const storedFramework = data.find((f: Framework) => f.id === storedFrameworkId);
        if (storedFramework) {
          setSelectedFramework(storedFramework);
        }
      }
    } catch (error) {
      console.error('Error fetching frameworks:', error);
      setFrameworksError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingFrameworks(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFrameworks();
  }, []);

  // Select framework
  const selectFramework = (framework: Framework) => {
    setSelectedFramework(framework);
    localStorage.setItem(STORAGE_KEYS.SELECTED_FRAMEWORK_ID, framework.id);
  };

  // Set onboarding completed
  const setOnboardingCompleted = (completed: boolean) => {
    setOnboardingCompletedState(completed);
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, String(completed));
    if (completed) {
      setOnboardingStepState('complete');
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, 'complete');
    }
  };

  // Set onboarding step
  const setOnboardingStep = (step: OnboardingStep) => {
    setOnboardingStepState(step);
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, step);
  };

  // Set API key configured
  const setApiKeyConfigured = (configured: boolean) => {
    setApiKeyConfiguredState(configured);
    localStorage.setItem(STORAGE_KEYS.API_KEY_CONFIGURED, String(configured));
  };

  // Refresh frameworks
  const refreshFrameworks = async () => {
    await fetchFrameworks();
  };

  // Determine if we should show onboarding
  const showOnboarding = !onboardingCompleted;

  // Context value
  const value: FrameworkContextState = {
    selectedFramework,
    selectedFrameworkId: selectedFramework?.id || null,
    frameworks,
    isLoadingFrameworks,
    frameworksError,
    onboardingCompleted,
    showOnboarding,
    onboardingStep,
    apiKeyConfigured,
    selectFramework,
    setOnboardingCompleted,
    setOnboardingStep,
    setApiKeyConfigured,
    refreshFrameworks,
  };

  return (
    <FrameworkContext.Provider value={value}>
      {children}
    </FrameworkContext.Provider>
  );
}

// Custom hook for using the context
export function useFramework() {
  const context = useContext(FrameworkContext);
  if (context === undefined) {
    throw new Error('useFramework must be used within a FrameworkProvider');
  }
  return context;
}

// Export the context for testing
export { FrameworkContext };
