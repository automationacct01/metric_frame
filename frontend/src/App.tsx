import { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context
import { FrameworkProvider, useFramework } from './contexts/FrameworkContext';

// Components
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import MetricsGrid from './components/MetricsGrid';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import FunctionDetail from './components/FunctionDetail';
import CatalogWizard from './components/CatalogWizard';
import CatalogManager from './components/CatalogManager';
import Documentation from './components/Documentation';
import { FrameworkSelection } from './components/onboarding';

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
  const { showOnboarding, isLoadingFrameworks } = useFramework();

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

  // Show onboarding if user hasn't selected a framework yet
  if (showOnboarding && !isLoadingFrameworks) {
    return <FrameworkSelection />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
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
          transition: 'margin-left 0.2s ease-in-out',
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/functions/:functionCode" element={<FunctionDetail />} />
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
          <FrameworkProvider>
            <AppContent />
          </FrameworkProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
