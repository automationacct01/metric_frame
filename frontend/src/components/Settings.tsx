import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  RestoreFromTrash as ResetIcon,
  Info as InfoIcon,
  SmartToy as AIIcon,
  Tune as TuneIcon,
  AdminPanelSettings as AdminIcon,
  Edit as EditorIcon,
  Visibility as ViewerIcon,
  People as PeopleIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';
import { ContentFrame } from './layout';
import { RISK_RATING_COLORS, RiskRating } from '../types';
import AIProviderSettings from './settings/AIProviderSettings';
import UserManagement from './settings/UserManagement';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDesktopAuth } from '../contexts/DesktopAuthContext';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import HttpsIcon from '@mui/icons-material/Https';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface RiskThresholds {
  very_low: number;
  low: number;
  medium: number;
  high: number;
}

interface AppSettings {
  riskThresholds: RiskThresholds;
  refreshInterval: number;
  autoRefresh: boolean;
  showNotifications: boolean;
  defaultPageSize: number;
  darkMode: boolean;
  language: string;
  timezone: string;
}

interface SettingsState {
  settings: AppSettings;
  originalSettings: AppSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: 'success' | 'error' | 'warning' | 'info';
  hasChanges: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  riskThresholds: {
    very_low: 90,
    low: 75,
    medium: 50,
    high: 30,
  },
  refreshInterval: 300000, // 5 minutes
  autoRefresh: true,
  showNotifications: true,
  defaultPageSize: 25,
  darkMode: false,
  language: 'en',
  timezone: 'UTC',
};

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function ThresholdInputs({
  thresholds,
  onChange,
}: {
  thresholds: RiskThresholds;
  onChange: (key: keyof RiskThresholds, value: number) => void;
}) {
  const [inputs, setInputs] = useState<Record<keyof RiskThresholds, string>>({
    very_low: String(thresholds.very_low),
    low: String(thresholds.low),
    medium: String(thresholds.medium),
    high: String(thresholds.high),
  });

  // Sync from parent when thresholds change externally (reset, load)
  useEffect(() => {
    setInputs({
      very_low: String(thresholds.very_low),
      low: String(thresholds.low),
      medium: String(thresholds.medium),
      high: String(thresholds.high),
    });
  }, [thresholds.very_low, thresholds.low, thresholds.medium, thresholds.high]);

  const handleInputChange = (key: keyof RiskThresholds, raw: string) => {
    // Allow empty and any numeric input while typing
    const cleaned = raw.replace(/[^0-9]/g, '');
    setInputs(prev => ({ ...prev, [key]: cleaned }));
    const num = Number(cleaned);
    if (cleaned !== '' && !isNaN(num)) {
      onChange(key, num);
    }
  };

  // Validate ordering: very_low > low > medium > high, all 1-99
  const getError = (key: keyof RiskThresholds): string | null => {
    const val = Number(inputs[key]);
    if (inputs[key] === '' || isNaN(val)) return 'Required';
    if (val < 1 || val > 99) return '1–99';
    if (key === 'very_low' && val <= thresholds.low) return 'Must be > Low';
    if (key === 'low' && val >= thresholds.very_low) return 'Must be < Very Low';
    if (key === 'low' && val <= thresholds.medium) return 'Must be > Medium';
    if (key === 'medium' && val >= thresholds.low) return 'Must be < Low';
    if (key === 'medium' && val <= thresholds.high) return 'Must be > High';
    if (key === 'high' && val >= thresholds.medium) return 'Must be < Medium';
    return null;
  };

  const rows = [
    { key: 'very_low' as keyof RiskThresholds, label: 'Very Low', rating: RiskRating.VERY_LOW, range: `≥ ${thresholds.very_low}%` },
    { key: 'low' as keyof RiskThresholds, label: 'Low', rating: RiskRating.LOW, range: `${thresholds.low}% – ${thresholds.very_low - 1}%` },
    { key: 'medium' as keyof RiskThresholds, label: 'Medium', rating: RiskRating.MEDIUM, range: `${thresholds.medium}% – ${thresholds.low - 1}%` },
    { key: 'high' as keyof RiskThresholds, label: 'High', rating: RiskRating.HIGH, range: `${thresholds.high}% – ${thresholds.medium - 1}%` },
  ];

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      {rows.map(({ key, label, rating, range }) => {
        const error = getError(key);
        return (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            <Box sx={{
              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              backgroundColor: RISK_RATING_COLORS[rating],
            }} />
            <Typography variant="body2" sx={{ width: 100, flexShrink: 0, fontWeight: 500 }}>
              {label}
            </Typography>
            <TextField
              size="small"
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              value={inputs[key]}
              onChange={(e) => handleInputChange(key, e.target.value)}
              error={!!error}
              helperText={error}
              InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">%</Typography> }}
              sx={{ width: 100 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {range}
            </Typography>
          </Box>
        );
      })}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Box sx={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          backgroundColor: RISK_RATING_COLORS[RiskRating.VERY_HIGH],
        }} />
        <Typography variant="body2" sx={{ width: 100, flexShrink: 0, fontWeight: 500 }}>
          Very High
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: '100px' }}>
          &lt; {thresholds.high}% (automatic)
        </Typography>
      </Box>
    </Box>
  );
}

// Security questions for desktop auth mode change
const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What was your favorite food as a child?",
  "What is the name of your favorite childhood friend?",
  "What was the make of your first car?",
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const { darkMode, setDarkMode } = useThemeMode();
  const { user: authUser, isAdmin } = useAuth();
  const desktopAuth = useDesktopAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Desktop auth settings state
  const [desktopAuthDialogOpen, setDesktopAuthDialogOpen] = useState(false);
  const [desktopAuthAction, setDesktopAuthAction] = useState<'changePassword' | 'enablePassword' | 'disablePassword' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [securityQuestion1, setSecurityQuestion1] = useState('');
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [desktopAuthError, setDesktopAuthError] = useState<string | null>(null);
  const [desktopAuthSaving, setDesktopAuthSaving] = useState(false);

  // TLS state
  const [tlsEnabled, setTlsEnabled] = useState(false);
  const [tlsLoading, setTlsLoading] = useState(false);
  const isCurrentlyHttps = window.location.protocol === 'https:';

  // Load desktop TLS setting on mount
  useEffect(() => {
    if (desktopAuth.isDesktopMode && (window as any).electronAPI?.getTlsEnabled) {
      (window as any).electronAPI.getTlsEnabled().then((enabled: boolean) => {
        setTlsEnabled(enabled);
      });
    }
  }, [desktopAuth.isDesktopMode]);

  // Update current time every second for the timezone preview
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [state, setState] = useState<SettingsState>({
    settings: DEFAULT_SETTINGS,
    originalSettings: DEFAULT_SETTINGS,
    loading: true,
    saving: false,
    error: null,
    snackbarOpen: false,
    snackbarMessage: '',
    snackbarSeverity: 'info',
    hasChanges: false,
  });

  const showSnackbar = (message: string, severity: typeof state.snackbarSeverity = 'info') => {
    setState(prev => ({
      ...prev,
      snackbarMessage: message,
      snackbarSeverity: severity,
      snackbarOpen: true,
    }));
  };

  const loadSettings = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Load risk thresholds from API
      const riskThresholdsResponse = await apiClient.getRiskThresholds();
      const riskThresholds = riskThresholdsResponse?.thresholds || DEFAULT_SETTINGS.riskThresholds;
      
      // Load other settings from localStorage or use defaults
      const storedSettings = localStorage.getItem('appSettings');
      const localSettings = storedSettings ? JSON.parse(storedSettings) : {};
      
      const settings: AppSettings = {
        riskThresholds: riskThresholds,
        refreshInterval: localSettings.refreshInterval || DEFAULT_SETTINGS.refreshInterval,
        autoRefresh: localSettings.autoRefresh !== undefined ? localSettings.autoRefresh : DEFAULT_SETTINGS.autoRefresh,
        showNotifications: localSettings.showNotifications !== undefined ? localSettings.showNotifications : DEFAULT_SETTINGS.showNotifications,
        defaultPageSize: localSettings.defaultPageSize || DEFAULT_SETTINGS.defaultPageSize,
        darkMode: localSettings.darkMode !== undefined ? localSettings.darkMode : DEFAULT_SETTINGS.darkMode,
        language: localSettings.language || DEFAULT_SETTINGS.language,
        timezone: localSettings.timezone || DEFAULT_SETTINGS.timezone,
      };
      
      setState(prev => ({
        ...prev,
        settings,
        originalSettings: { ...settings },
        loading: false,
        hasChanges: false,
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load settings. Using defaults.',
        settings: DEFAULT_SETTINGS,
        originalSettings: DEFAULT_SETTINGS,
      }));
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setState(prev => {
      const newSettings = { ...prev.settings, [key]: value };
      const hasChanges = JSON.stringify(newSettings) !== JSON.stringify(prev.originalSettings);
      
      return {
        ...prev,
        settings: newSettings,
        hasChanges,
      };
    });
  };

  const handleRiskThresholdChange = (threshold: keyof RiskThresholds, value: number) => {
    setState(prev => {
      const newRiskThresholds = { ...prev.settings.riskThresholds, [threshold]: value };
      const newSettings = { ...prev.settings, riskThresholds: newRiskThresholds };
      const hasChanges = JSON.stringify(newSettings) !== JSON.stringify(prev.originalSettings);
      
      return {
        ...prev,
        settings: newSettings,
        hasChanges,
      };
    });
  };

  const saveSettings = async () => {
    setState(prev => ({ ...prev, saving: true, error: null }));
    
    try {
      // Save local settings to localStorage
      const localSettings = {
        refreshInterval: state.settings.refreshInterval,
        autoRefresh: state.settings.autoRefresh,
        showNotifications: state.settings.showNotifications,
        defaultPageSize: state.settings.defaultPageSize,
        darkMode: state.settings.darkMode,
        language: state.settings.language,
        timezone: state.settings.timezone,
      };
      
      localStorage.setItem('appSettings', JSON.stringify(localSettings));


      setState(prev => ({
        ...prev,
        saving: false,
        hasChanges: false,
        originalSettings: { ...prev.settings },
      }));
      
      showSnackbar('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setState(prev => ({ ...prev, saving: false }));
      showSnackbar('Failed to save settings', 'error');
    }
  };

  const resetSettings = () => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.originalSettings },
      hasChanges: false,
    }));
  };

  const resetToDefaults = () => {
    setState(prev => ({
      ...prev,
      settings: { ...DEFAULT_SETTINGS },
      hasChanges: true,
    }));
  };

  const formatRefreshInterval = (value: number): string => {
    if (value < 60000) return `${value / 1000}s`;
    if (value < 3600000) return `${value / 60000}m`;
    return `${value / 3600000}h`;
  };

  const getRiskRatingFromScore = (score: number): RiskRating => {
    const { riskThresholds } = state.settings;
    if (score >= riskThresholds.very_low) return RiskRating.VERY_LOW;
    if (score >= riskThresholds.low) return RiskRating.LOW;
    if (score >= riskThresholds.medium) return RiskRating.MEDIUM;
    if (score >= riskThresholds.high) return RiskRating.HIGH;
    return RiskRating.VERY_HIGH;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Desktop auth handlers
  const resetDesktopAuthForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSecurityQuestion1('');
    setSecurityAnswer1('');
    setSecurityQuestion2('');
    setSecurityAnswer2('');
    setDesktopAuthError(null);
    setShowPasswords(false);
  };

  const handleDesktopAuthDialogClose = () => {
    setDesktopAuthDialogOpen(false);
    setDesktopAuthAction(null);
    resetDesktopAuthForm();
  };

  const handleChangePassword = async () => {
    setDesktopAuthError(null);

    if (newPassword.length < 8) {
      setDesktopAuthError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setDesktopAuthError('Passwords do not match');
      return;
    }

    setDesktopAuthSaving(true);
    try {
      await desktopAuth.changePassword(currentPassword, newPassword);
      handleDesktopAuthDialogClose();
      showSnackbar('Password changed successfully', 'success');
    } catch (err) {
      setDesktopAuthError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setDesktopAuthSaving(false);
    }
  };

  const handleEnablePassword = async () => {
    setDesktopAuthError(null);

    if (newPassword.length < 8) {
      setDesktopAuthError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setDesktopAuthError('Passwords do not match');
      return;
    }
    if (!securityQuestion1 || !securityAnswer1.trim()) {
      setDesktopAuthError('Please complete security question 1');
      return;
    }
    if (!securityQuestion2 || !securityAnswer2.trim()) {
      setDesktopAuthError('Please complete security question 2');
      return;
    }
    if (securityQuestion1 === securityQuestion2) {
      setDesktopAuthError('Please select different security questions');
      return;
    }

    setDesktopAuthSaving(true);
    try {
      await desktopAuth.changeAuthMode('password', {
        new_password: newPassword,
        security_question_1: securityQuestion1,
        security_answer_1: securityAnswer1,
        security_question_2: securityQuestion2,
        security_answer_2: securityAnswer2,
      });
      handleDesktopAuthDialogClose();
      showSnackbar('Password protection enabled', 'success');
    } catch (err) {
      setDesktopAuthError(err instanceof Error ? err.message : 'Failed to enable password');
    } finally {
      setDesktopAuthSaving(false);
    }
  };

  const handleDisablePassword = async () => {
    setDesktopAuthError(null);

    setDesktopAuthSaving(true);
    try {
      await desktopAuth.changeAuthMode('none', {
        current_password: currentPassword,
      });
      handleDesktopAuthDialogClose();
      showSnackbar('Password protection disabled', 'success');
    } catch (err) {
      setDesktopAuthError(err instanceof Error ? err.message : 'Failed to disable password');
    } finally {
      setDesktopAuthSaving(false);
    }
  };

  const handleTlsToggle = async () => {
    if (!desktopAuth.isDesktopMode || !(window as any).electronAPI?.setTlsEnabled) return;

    setTlsLoading(true);
    try {
      const newValue = !tlsEnabled;
      await (window as any).electronAPI.setTlsEnabled(newValue);
      setTlsEnabled(newValue);
      // Sync to localStorage so the API client picks it up after restart
      localStorage.setItem('metricframe_tls_enabled', String(newValue));
      showSnackbar(
        newValue
          ? 'HTTPS enabled — please restart the application for changes to take effect'
          : 'HTTPS disabled — please restart the application for changes to take effect',
        'warning'
      );
    } catch (err) {
      showSnackbar('Failed to update HTTPS setting', 'error');
    } finally {
      setTlsLoading(false);
    }
  };

  return (
    <ContentFrame>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      {/* Settings Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
          <Tab icon={<TuneIcon />} iconPosition="start" label="General" />
          <Tab icon={<AIIcon />} iconPosition="start" label="AI Configuration" />
          {isAdmin && !desktopAuth.isDesktopMode && <Tab icon={<PeopleIcon />} iconPosition="start" label="Users" />}
        </Tabs>
      </Box>

      {/* General Settings Tab */}
      <TabPanel value={activeTab} index={0}>
        {state.error && (
          <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
            {state.error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Desktop Authentication Settings - Only show in desktop mode */}
          {desktopAuth.isDesktopMode && (
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  avatar={<LockIcon color="primary" />}
                  title="Desktop Authentication"
                  subheader="Manage password protection for your desktop app"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: desktopAuth.authMode === 'password' ? 'success.main' : 'grey.500',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}>
                      {desktopAuth.authMode === 'password' ? (
                        <><LockIcon fontSize="small" /> Password Protected</>
                      ) : (
                        <><LockOpenIcon fontSize="small" /> No Password</>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {desktopAuth.authMode === 'password'
                        ? 'Your app requires a password to unlock'
                        : 'Your app opens directly without a password'}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {desktopAuth.authMode === 'password' ? (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<LockIcon />}
                          onClick={() => {
                            setDesktopAuthAction('changePassword');
                            setDesktopAuthDialogOpen(true);
                          }}
                        >
                          Change Password
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<LockOpenIcon />}
                          onClick={() => {
                            setDesktopAuthAction('disablePassword');
                            setDesktopAuthDialogOpen(true);
                          }}
                        >
                          Disable Password
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<LockIcon />}
                        onClick={() => {
                          setDesktopAuthAction('enablePassword');
                          setDesktopAuthDialogOpen(true);
                        }}
                      >
                        Enable Password Protection
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Desktop Encrypted Connections - Only show in desktop mode */}
          {desktopAuth.isDesktopMode && (
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  avatar={<HttpsIcon color="primary" />}
                  title="Local Traffic Encryption"
                  subheader="Encrypt communication between the app interface and the local backend server"
                />
                <CardContent>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This setting controls encryption for <strong>local traffic only</strong> — data
                    sent between the app interface and the backend server running on your machine.
                    When enabled, a self-signed TLS certificate is generated automatically on next launch.
                  </Alert>
                  <Alert severity="success" sx={{ mb: 2 }} icon={<HttpsIcon fontSize="inherit" />}>
                    <strong>AI API connections are always encrypted.</strong> All traffic between
                    MetricFrame and external AI providers (OpenAI, Anthropic, etc.) uses
                    HTTPS/TLS encryption regardless of this setting.
                  </Alert>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={tlsEnabled}
                        onChange={handleTlsToggle}
                        disabled={tlsLoading}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">
                          Enable local HTTPS encryption
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tlsEnabled
                            ? 'Local connections are encrypted with TLS — restart required to apply'
                            : 'Local connections use HTTP (unencrypted on localhost)'}
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Docker/Web Encrypted Connections - Only show in non-desktop mode */}
          {!desktopAuth.isDesktopMode && (
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  avatar={<HttpsIcon color="primary" />}
                  title="Local Traffic Encryption"
                  subheader="Encrypt communication between your browser and the MetricFrame server"
                  action={
                    <Chip
                      label={isCurrentlyHttps ? 'HTTPS Active' : 'HTTP (No Encryption)'}
                      color={isCurrentlyHttps ? 'success' : 'default'}
                      size="small"
                    />
                  }
                />
                <CardContent>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This controls encryption for <strong>local traffic only</strong> — data
                    sent between your browser and the MetricFrame server.
                    TLS is managed via Docker configuration and requires a container restart.
                  </Alert>
                  <Alert severity="success" sx={{ mb: 2 }} icon={<HttpsIcon fontSize="inherit" />}>
                    <strong>AI API connections are always encrypted.</strong> All traffic between
                    MetricFrame and external AI providers (OpenAI, Anthropic, etc.) uses
                    HTTPS/TLS encryption regardless of this setting.
                  </Alert>

                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    {isCurrentlyHttps ? 'To disable HTTPS:' : 'To enable HTTPS:'}
                  </Typography>
                  <Box sx={{
                    bgcolor: darkMode ? 'grey.900' : 'grey.100',
                    p: 1.5,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    overflowX: 'auto',
                  }}>
                    {isCurrentlyHttps
                      ? 'curl -fsSL https://get.metricframe.ai/disable-tls.sh | bash'
                      : 'curl -fsSL https://get.metricframe.ai/enable-tls.sh | bash'}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Run this command in your terminal from the MetricFrame install directory.
                    Containers will be restarted automatically.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Current Session Info */}
          {authUser && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {authUser.role === 'admin' ? (
                      <AdminIcon color="error" sx={{ fontSize: 32 }} />
                    ) : authUser.role === 'editor' ? (
                      <EditorIcon color="primary" sx={{ fontSize: 32 }} />
                    ) : (
                      <ViewerIcon color="action" sx={{ fontSize: 32 }} />
                    )}
                    <Box>
                      <Typography variant="h6">{authUser.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {authUser.email}
                      </Typography>
                    </Box>
                    <Chip
                      label={authUser.role.toUpperCase()}
                      color={authUser.role === 'admin' ? 'error' : authUser.role === 'editor' ? 'primary' : 'default'}
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {authUser.role === 'admin' && 'Full access: Can create, edit, delete catalogs and manage users'}
                    {authUser.role === 'editor' && 'Editor access: Can create and edit catalogs, but cannot delete'}
                    {authUser.role === 'viewer' && 'View only: Can view dashboards and reports'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Risk Thresholds */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Risk Rating Thresholds"
              subheader="Configure the score ranges for different risk levels"
              action={
                <Tooltip title="These thresholds determine how metric scores map to risk ratings">
                  <IconButton>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <CardContent>
              {/* Threshold Overview */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Current Thresholds Overview
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  height: 20, 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  boxShadow: 1,
                  mb: 2
                }}>
                  <Box sx={{ 
                    backgroundColor: RISK_RATING_COLORS[RiskRating.VERY_LOW], 
                    flexGrow: 100 - state.settings.riskThresholds.very_low,
                    minWidth: 10
                  }} />
                  <Box sx={{ 
                    backgroundColor: RISK_RATING_COLORS[RiskRating.LOW], 
                    flexGrow: state.settings.riskThresholds.very_low - state.settings.riskThresholds.low,
                    minWidth: 10
                  }} />
                  <Box sx={{ 
                    backgroundColor: RISK_RATING_COLORS[RiskRating.MEDIUM], 
                    flexGrow: state.settings.riskThresholds.low - state.settings.riskThresholds.medium,
                    minWidth: 10
                  }} />
                  <Box sx={{ 
                    backgroundColor: RISK_RATING_COLORS[RiskRating.HIGH], 
                    flexGrow: state.settings.riskThresholds.medium - state.settings.riskThresholds.high,
                    minWidth: 10
                  }} />
                  <Box sx={{ 
                    backgroundColor: RISK_RATING_COLORS[RiskRating.VERY_HIGH], 
                    flexGrow: state.settings.riskThresholds.high,
                    minWidth: 10
                  }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', typography: 'caption', color: 'text.secondary' }}>
                  <span>0%</span>
                  <span>{state.settings.riskThresholds.high}%</span>
                  <span>{state.settings.riskThresholds.medium}%</span>
                  <span>{state.settings.riskThresholds.low}%</span>
                  <span>{state.settings.riskThresholds.very_low}%</span>
                  <span>100%</span>
                </Box>
              </Box>

              {/* Threshold Configuration */}
              <ThresholdInputs
                thresholds={state.settings.riskThresholds}
                onChange={handleRiskThresholdChange}
              />

              {/* Preview Section */}
              <Divider sx={{ my: 4 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  Risk Level Examples
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  flexWrap: 'wrap', 
                  justifyContent: 'center',
                  maxWidth: 600,
                  mx: 'auto'
                }}>
                  {[95, 82, 65, 40, 20].map((score) => (
                    <Chip
                      key={score}
                      label={`${score}% = ${getRiskRatingFromScore(score).charAt(0).toUpperCase() + getRiskRatingFromScore(score).slice(1).toLowerCase().replace('_', ' ')}`}
                      sx={{
                        backgroundColor: RISK_RATING_COLORS[getRiskRatingFromScore(score)],
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 'medium',
                        py: 1,
                        px: 2,
                      }}
                    />
                  ))}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  These examples show how different scores map to risk levels with your current thresholds
                </Typography>
              </Box>

              {/* Save button for this section */}
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={saveSettings}
                  disabled={state.saving || !state.hasChanges}
                >
                  {state.saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Application Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Application Preferences" />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.settings.autoRefresh}
                      onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                    />
                  }
                  label="Auto-refresh data"
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Refresh Interval: {formatRefreshInterval(state.settings.refreshInterval)}
                </Typography>
                <Slider
                  value={state.settings.refreshInterval}
                  onChange={(_, value) => handleSettingChange('refreshInterval', value as number)}
                  min={30000} // 30 seconds
                  max={1800000} // 30 minutes
                  step={30000}
                  disabled={!state.settings.autoRefresh}
                  marks={[
                    { value: 60000, label: '1m' },
                    { value: 300000, label: '5m' },
                    { value: 900000, label: '15m' },
                    { value: 1800000, label: '30m' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatRefreshInterval}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Default Page Size</InputLabel>
                  <Select
                    value={state.settings.defaultPageSize}
                    label="Default Page Size"
                    onChange={(e) => handleSettingChange('defaultPageSize', Number(e.target.value))}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={state.settings.showNotifications}
                    onChange={(e) => handleSettingChange('showNotifications', e.target.checked)}
                  />
                }
                label="Show notifications"
              />

              {/* Save button for this section */}
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={saveSettings}
                  disabled={state.saving || !state.hasChanges}
                >
                  {state.saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="System Preferences" />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                  }
                  label={darkMode ? "Dark mode" : "Light mode"}
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={state.settings.timezone}
                  label="Timezone"
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                  <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                  <MenuItem value="America/Anchorage">Alaska Time (AKT)</MenuItem>
                  <MenuItem value="Pacific/Honolulu">Hawaii Time (HST)</MenuItem>
                  <MenuItem value="Europe/London">London (GMT/BST)</MenuItem>
                  <MenuItem value="Europe/Paris">Central European (CET)</MenuItem>
                  <MenuItem value="Europe/Berlin">Berlin (CET)</MenuItem>
                  <MenuItem value="Asia/Tokyo">Tokyo (JST)</MenuItem>
                  <MenuItem value="Asia/Shanghai">China (CST)</MenuItem>
                  <MenuItem value="Asia/Singapore">Singapore (SGT)</MenuItem>
                  <MenuItem value="Australia/Sydney">Sydney (AEST)</MenuItem>
                </Select>
              </FormControl>

              {/* Live clock showing current time in selected timezone */}
              <Box sx={{
                mt: 2,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <AccessTimeIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {currentTime.toLocaleString('en-US', {
                      timeZone: state.settings.timezone,
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Current time in {state.settings.timezone}
                  </Typography>
                </Box>
              </Box>

              {/* Save button for this section */}
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={saveSettings}
                  disabled={state.saving || !state.hasChanges}
                >
                  {state.saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Action Buttons */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={loadSettings}
            startIcon={<RefreshIcon />}
            disabled={state.loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            onClick={resetToDefaults}
            startIcon={<ResetIcon />}
            disabled={state.loading}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="outlined"
            onClick={resetSettings}
            disabled={state.loading || !state.hasChanges}
          >
            Cancel Changes
          </Button>
          <Button
            variant="contained"
            onClick={saveSettings}
            startIcon={<SaveIcon />}
            disabled={state.loading || state.saving || !state.hasChanges}
          >
            {state.saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </TabPanel>

      {/* AI Configuration Tab */}
      <TabPanel value={activeTab} index={1}>
        <AIProviderSettings userId="admin" />
      </TabPanel>

      {/* Users Tab - Admin only, hidden in desktop mode (single-user) */}
      {isAdmin && !desktopAuth.isDesktopMode && (
        <TabPanel value={activeTab} index={2}>
          <UserManagement />
        </TabPanel>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={state.snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setState(prev => ({ ...prev, snackbarOpen: false }))}
      >
        <Alert
          severity={state.snackbarSeverity}
          onClose={() => setState(prev => ({ ...prev, snackbarOpen: false }))}
        >
          {state.snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Desktop Auth Dialog */}
      <Dialog
        open={desktopAuthDialogOpen}
        onClose={handleDesktopAuthDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {desktopAuthAction === 'changePassword' && 'Change Password'}
          {desktopAuthAction === 'enablePassword' && 'Enable Password Protection'}
          {desktopAuthAction === 'disablePassword' && 'Disable Password Protection'}
        </DialogTitle>
        <DialogContent>
          {desktopAuthError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDesktopAuthError(null)}>
              {desktopAuthError}
            </Alert>
          )}

          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Change Password Form */}
            {desktopAuthAction === 'changePassword' && (
              <>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPasswords(!showPasswords)} edge="end">
                          {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  helperText="Minimum 8 characters"
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </>
            )}

            {/* Enable Password Form */}
            {desktopAuthAction === 'enablePassword' && (
              <>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  helperText="Minimum 8 characters"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPasswords(!showPasswords)} edge="end">
                          {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Security Questions (for password recovery)
                </Typography>

                <FormControl fullWidth>
                  <InputLabel>Security Question 1</InputLabel>
                  <Select
                    value={securityQuestion1}
                    label="Security Question 1"
                    onChange={(e) => setSecurityQuestion1(e.target.value)}
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <MenuItem key={q} value={q} disabled={q === securityQuestion2}>
                        {q}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Answer 1"
                  value={securityAnswer1}
                  onChange={(e) => setSecurityAnswer1(e.target.value)}
                  helperText="Answers are not case-sensitive"
                />

                <FormControl fullWidth>
                  <InputLabel>Security Question 2</InputLabel>
                  <Select
                    value={securityQuestion2}
                    label="Security Question 2"
                    onChange={(e) => setSecurityQuestion2(e.target.value)}
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <MenuItem key={q} value={q} disabled={q === securityQuestion1}>
                        {q}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Answer 2"
                  value={securityAnswer2}
                  onChange={(e) => setSecurityAnswer2(e.target.value)}
                />
              </>
            )}

            {/* Disable Password Form */}
            {desktopAuthAction === 'disablePassword' && (
              <>
                <Alert severity="warning">
                  This will remove password protection. Anyone with access to this computer will be able to open the app.
                </Alert>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  helperText="Enter your current password to confirm"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPasswords(!showPasswords)} edge="end">
                          {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDesktopAuthDialogClose} disabled={desktopAuthSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (desktopAuthAction === 'changePassword') handleChangePassword();
              else if (desktopAuthAction === 'enablePassword') handleEnablePassword();
              else if (desktopAuthAction === 'disablePassword') handleDisablePassword();
            }}
            disabled={desktopAuthSaving}
          >
            {desktopAuthSaving ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </ContentFrame>
  );
}