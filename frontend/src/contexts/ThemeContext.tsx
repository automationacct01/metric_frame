import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';

// Light theme configuration
const lightPalette = {
  mode: 'light' as const,
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
};

// Dark theme configuration
const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#38bdf8', // Lighter sky blue for dark mode
    contrastText: '#000000',
  },
  secondary: {
    main: '#a78bfa', // Lighter purple for dark mode
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e',
  },
  success: {
    main: '#10b981',
  },
  warning: {
    main: '#f59e0b',
  },
  error: {
    main: '#ef4444',
  },
};

// Shared theme configuration
const getThemeConfig = (mode: 'light' | 'dark') => ({
  palette: mode === 'dark' ? darkPalette : lightPalette,
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
          boxShadow: mode === 'dark'
            ? '0 2px 4px rgba(0,0,0,0.3)'
            : '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient in dark mode
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize from localStorage, defaulting to light mode
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem('appSettings');
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        if (typeof settings.darkMode === 'boolean') {
          return settings.darkMode;
        }
      } catch {
        // Ignore parse errors
      }
    }
    // Explicitly initialize localStorage to light mode on first launch
    const initialSettings = { darkMode: false };
    localStorage.setItem('appSettings', JSON.stringify(initialSettings));
    return false;
  });

  // Sync with localStorage changes from Settings component
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('appSettings');
      if (stored) {
        try {
          const settings = JSON.parse(stored);
          if (typeof settings.darkMode === 'boolean') {
            setDarkModeState(settings.darkMode);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };

    // Listen for storage changes from other tabs
    window.addEventListener('storage', handleStorageChange);

    // Also poll for changes from same-tab Settings updates
    const interval = setInterval(() => {
      const stored = localStorage.getItem('appSettings');
      if (stored) {
        try {
          const settings = JSON.parse(stored);
          if (typeof settings.darkMode === 'boolean' && settings.darkMode !== darkMode) {
            setDarkModeState(settings.darkMode);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkModeState(prev => {
      const newValue = !prev;
      // Update localStorage
      const stored = localStorage.getItem('appSettings');
      const settings = stored ? JSON.parse(stored) : {};
      settings.darkMode = newValue;
      localStorage.setItem('appSettings', JSON.stringify(settings));
      return newValue;
    });
  };

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    // Update localStorage
    const stored = localStorage.getItem('appSettings');
    const settings = stored ? JSON.parse(stored) : {};
    settings.darkMode = value;
    localStorage.setItem('appSettings', JSON.stringify(settings));
  };

  // Create theme based on current mode
  const theme = useMemo<Theme>(
    () => createTheme(getThemeConfig(darkMode ? 'dark' : 'light')),
    [darkMode]
  );

  const contextValue = useMemo(
    () => ({ darkMode, toggleDarkMode, setDarkMode }),
    [darkMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
