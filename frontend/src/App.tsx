import { useState, useCallback } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Use HashRouter for desktop (file:// protocol), BrowserRouter for web
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context
import { FrameworkProvider, useFramework } from './contexts/FrameworkContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import MetricsGrid from './components/MetricsGrid';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import FunctionDetail from './components/FunctionDetail';
import CategoryDetail from './components/CategoryDetail';
import CatalogWizard from './components/CatalogWizard';
import CatalogManager from './components/CatalogManager';
import Documentation from './components/Documentation';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import { FrameworkSelection, APIKeySetup } from './components/onboarding';

// Landing Page
import LandingPage from './pages/LandingPage';
import DownloadPage from './pages/DownloadPage';

// Protected Route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, but save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Admin Route wrapper - redirects to dashboard if not admin
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    // Non-admins can't access this route - redirect to dashboard
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}

// Theme is now managed by ThemeContext

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Main app content with framework-aware routing
function AppContent() {
  const {
    showOnboarding,
    isLoadingFrameworks,
    onboardingStep,
    setOnboardingStep,
    setOnboardingCompleted,
    setApiKeyConfigured,
  } = useFramework();

  // Sidebar collapsed state - persisted to localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('sidebarCollapsed', String(newValue));
      return newValue;
    });
  }, []);

  // Handle API key setup completion
  const handleApiKeyComplete = useCallback(() => {
    setApiKeyConfigured(true);
    setOnboardingCompleted(true);
  }, [setApiKeyConfigured, setOnboardingCompleted]);

  // Handle API key setup skip
  const handleApiKeySkip = useCallback(() => {
    setOnboardingCompleted(true);
  }, [setOnboardingCompleted]);

  // Show onboarding if not completed
  if (showOnboarding && !isLoadingFrameworks) {
    // Step 1: Framework selection
    if (onboardingStep === 'framework') {
      return <FrameworkSelection />;
    }
    // Step 2: API key setup
    if (onboardingStep === 'apikey') {
      return (
        <APIKeySetup
          onComplete={handleApiKeyComplete}
          onSkip={handleApiKeySkip}
        />
      );
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/functions/:functionCode" element={<FunctionDetail />} />
          <Route path="/functions/:functionCode/categories/:categoryCode" element={<CategoryDetail />} />
          <Route path="/metrics" element={<MetricsGrid />} />
          <Route path="/catalog-wizard" element={<CatalogWizard />} />
          <Route path="/catalog-manager" element={<CatalogManager />} />
          <Route path="/ai-assistant" element={<AIChat />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
        </Routes>
      </Box>
    </Box>
  );
}

// Determine if we should show landing page or go to login
// Landing page is only for the public website, not desktop or Docker
function RootRoute() {
  const isDesktop = window.location.protocol === 'file:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Desktop app or Docker/local dev → go to login
  if (isDesktop || isLocalhost) {
    return <Navigate to="/login" replace />;
  }

  // Public website → show landing page
  return <LandingPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <Routes>
              {/* Root route - landing page for website, login for desktop/Docker */}
              <Route path="/" element={<RootRoute />} />

              {/* Download page for Docker/Desktop options */}
              <Route path="/download" element={<DownloadPage />} />

              {/* Login page */}
              <Route path="/login" element={<Login />} />

              {/* Forgot password page */}
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Main app with framework context at /app/* - protected */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <FrameworkProvider>
                      <AppContent />
                    </FrameworkProvider>
                  </ProtectedRoute>
                }
              />

              {/* Backward compatibility redirects for old URLs */}
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/metrics" element={<Navigate to="/app/metrics" replace />} />
              <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
              <Route path="/ai-assistant" element={<Navigate to="/app/ai-assistant" replace />} />
              <Route path="/catalog-wizard" element={<Navigate to="/app/catalog-wizard" replace />} />
              <Route path="/catalog-manager" element={<Navigate to="/app/catalog-manager" replace />} />
              <Route path="/docs" element={<Navigate to="/app/docs" replace />} />
              <Route path="/functions/:functionCode" element={<Navigate to="/app/functions/:functionCode" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
