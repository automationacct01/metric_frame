import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Use HashRouter for desktop (file:// protocol), BrowserRouter for web
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context
import { FrameworkProvider, useFramework } from './contexts/FrameworkContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DesktopAuthProvider, useDesktopAuth } from './contexts/DesktopAuthContext';

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

// Desktop auth components
import DesktopSetup from './components/desktop/DesktopSetup';
import DesktopLogin from './components/desktop/DesktopLogin';
import DesktopForgotPassword from './components/desktop/DesktopForgotPassword';

// Landing Page
import LandingPage from './pages/LandingPage';
import DownloadPage from './pages/DownloadPage';
import WikiPage from './pages/WikiPage';

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
  const { isDesktopMode } = useDesktopAuth();

  // Desktop mode = single user with full admin access
  if (isDesktopMode) {
    return <>{children}</>;
  }

  if (!isAdmin) {
    // Non-admins can't access this route - redirect to dashboard
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}

// Desktop Auth Router - handles simplified desktop authentication flow
function DesktopAuthRouter() {
  const { isDesktopMode, setupCompleted, authMode, isAuthenticated, isLoading } = useDesktopAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Not in desktop mode - fall through to regular auth
  if (!isDesktopMode) {
    return null;
  }

  // Loading state
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

  // Setup not completed - show setup wizard
  if (!setupCompleted) {
    return <DesktopSetup />;
  }

  // No auth mode - user is automatically authenticated
  if (authMode === 'none') {
    return null; // Fall through to app content
  }

  // Password mode but not authenticated - show login
  if (authMode === 'password' && !isAuthenticated) {
    if (showForgotPassword) {
      return (
        <DesktopForgotPassword
          onBack={() => setShowForgotPassword(false)}
          onSuccess={() => setShowForgotPassword(false)}
        />
      );
    }
    return <DesktopLogin onForgotPassword={() => setShowForgotPassword(true)} />;
  }

  // Authenticated - fall through to app content
  return null;
}

// Desktop Protected Route - wrapper for desktop mode that bypasses regular auth
function DesktopProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isDesktopMode, isAuthenticated, authMode, setupCompleted, isLoading } = useDesktopAuth();

  // Not desktop mode - use regular auth flow
  if (!isDesktopMode) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

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

  // Desktop mode - check desktop auth
  if (!setupCompleted) {
    return <Navigate to="/" replace />;
  }

  // No auth mode = always authenticated after setup
  if (authMode === 'none') {
    return <>{children}</>;
  }

  // Password mode - check if authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
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
  const { isDesktopMode } = useDesktopAuth();

  // Desktop mode: auto-complete onboarding (user can configure in Settings)
  useEffect(() => {
    if (isDesktopMode && showOnboarding) {
      setOnboardingCompleted(true);
    }
  }, [isDesktopMode, showOnboarding, setOnboardingCompleted]);

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

  // Show onboarding if not completed (skipped in desktop mode)
  if (showOnboarding && !isDesktopMode && !isLoadingFrameworks) {
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

// Desktop Root Route - shows desktop auth flow or redirects to app
function DesktopRootRoute() {
  const desktopAuth = useDesktopAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Loading
  if (desktopAuth.isLoading) {
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

  // Not desktop mode - shouldn't happen but handle it
  if (!desktopAuth.isDesktopMode) {
    return <Navigate to="/login" replace />;
  }

  // Setup not completed - show setup wizard
  if (!desktopAuth.setupCompleted) {
    return <DesktopSetup />;
  }

  // No auth mode - go straight to dashboard
  if (desktopAuth.authMode === 'none') {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Password mode but not authenticated - show login
  if (!desktopAuth.isAuthenticated) {
    if (showForgotPassword) {
      return (
        <DesktopForgotPassword
          onBack={() => setShowForgotPassword(false)}
          onSuccess={() => setShowForgotPassword(false)}
        />
      );
    }
    return <DesktopLogin onForgotPassword={() => setShowForgotPassword(true)} />;
  }

  // Authenticated - go to dashboard
  return <Navigate to="/app/dashboard" replace />;
}

// Determine if we should show landing page or go to login
// Landing page is only for the public website, not desktop or Docker
function RootRoute() {
  const isDesktop = window.location.protocol === 'file:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Desktop app → use desktop auth flow
  if (isDesktop) {
    return <DesktopRootRoute />;
  }

  // Docker/local dev → go to regular login
  if (isLocalhost) {
    return <Navigate to="/login" replace />;
  }

  // Public website → show landing page
  return <LandingPage />;
}

function App() {
  // Check if we're in desktop mode
  const isDesktop = window.location.protocol === 'file:';

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CssBaseline />
        <Router>
          <DesktopAuthProvider>
            <AuthProvider>
              <Routes>
                {/* Root route - landing page for website, desktop auth for desktop, login for Docker */}
                <Route path="/" element={<RootRoute />} />

                {/* Download page for Docker/Desktop options */}
                <Route path="/download" element={<DownloadPage />} />

                {/* Public wiki/documentation */}
                <Route path="/wiki" element={<WikiPage />} />
                <Route path="/wiki/:pageId" element={<WikiPage />} />

                {/* Login page - only for web/Docker, desktop uses its own auth */}
                <Route path="/login" element={<Login />} />

                {/* Forgot password page - only for web/Docker */}
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Main app with framework context at /app/* - protected */}
                <Route
                  path="/app/*"
                  element={
                    isDesktop ? (
                      <DesktopProtectedRoute>
                        <FrameworkProvider>
                          <AppContent />
                        </FrameworkProvider>
                      </DesktopProtectedRoute>
                    ) : (
                      <ProtectedRoute>
                        <FrameworkProvider>
                          <AppContent />
                        </FrameworkProvider>
                      </ProtectedRoute>
                    )
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
          </DesktopAuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
