import { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context
import { FrameworkProvider, useFramework } from './contexts/FrameworkContext';

// Components
import Navbar, { drawerWidthExpanded, drawerWidthCollapsed } from './components/Navbar';
import Dashboard from './components/Dashboard';
import MetricsGrid from './components/MetricsGrid';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import FunctionDetail from './components/FunctionDetail';
import CategoryDetail from './components/CategoryDetail';
import CatalogWizard from './components/CatalogWizard';
import CatalogManager from './components/CatalogManager';
import Documentation from './components/Documentation';
import { FrameworkSelection, APIKeySetup } from './components/onboarding';

// Landing Page
import LandingPage from './pages/LandingPage';
import DownloadPage from './pages/DownloadPage';

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#0ea5e9', // MetricFrame Sky Blue
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7C3AED', // Purple for AI RMF
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#059669',
    },
    warning: {
      main: '#D97706',
    },
    error: {
      main: '#DC2626',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
        },
      },
    },
  },
});

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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Landing page at root - marketing entry point */}
            <Route path="/" element={<LandingPage />} />

            {/* Download page for Docker/Desktop options */}
            <Route path="/download" element={<DownloadPage />} />

            {/* Main app with framework context at /app/* */}
            <Route
              path="/app/*"
              element={
                <FrameworkProvider>
                  <AppContent />
                </FrameworkProvider>
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
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
