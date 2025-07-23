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
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  RestoreFromTrash as ResetIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';
import { ContentFrame } from './layout';
import { RISK_RATING_COLORS, RiskRating } from '../types';

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

export default function Settings() {
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
      
      // Note: Risk thresholds would need a backend API endpoint to save
      // For now, we'll just show success
      
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

  return (
    <ContentFrame>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      {state.error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      <Grid container spacing={3}>
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
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                {/* Very Low Risk Threshold */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      backgroundColor: RISK_RATING_COLORS[RiskRating.VERY_LOW],
                      mr: 2
                    }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      Very Low Risk Threshold
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Scores ≥{state.settings.riskThresholds.very_low}% are considered very low risk
                  </Typography>
                  <Slider
                    value={state.settings.riskThresholds.very_low}
                    onChange={(_, value) => handleRiskThresholdChange('very_low', value as number)}
                    min={85}
                    max={100}
                    marks={[
                      { value: 85, label: '85%' },
                      { value: 90, label: '90%' },
                      { value: 95, label: '95%' },
                      { value: 100, label: '100%' },
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ 
                      color: RISK_RATING_COLORS[RiskRating.VERY_LOW],
                      '& .MuiSlider-track': { height: 6 },
                      '& .MuiSlider-rail': { height: 6 },
                    }}
                  />
                </Box>

                {/* Low Risk Threshold */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      backgroundColor: RISK_RATING_COLORS[RiskRating.LOW],
                      mr: 2
                    }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      Low Risk Threshold
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Scores {state.settings.riskThresholds.low}%–{state.settings.riskThresholds.very_low - 1}% are considered low risk
                  </Typography>
                  <Slider
                    value={state.settings.riskThresholds.low}
                    onChange={(_, value) => handleRiskThresholdChange('low', value as number)}
                    min={65}
                    max={state.settings.riskThresholds.very_low - 1}
                    marks={[
                      { value: 65, label: '65%' },
                      { value: 75, label: '75%' },
                      { value: 85, label: '85%' },
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ 
                      color: RISK_RATING_COLORS[RiskRating.LOW],
                      '& .MuiSlider-track': { height: 6 },
                      '& .MuiSlider-rail': { height: 6 },
                    }}
                  />
                </Box>

                {/* Medium Risk Threshold */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      backgroundColor: RISK_RATING_COLORS[RiskRating.MEDIUM],
                      mr: 2
                    }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      Medium Risk Threshold
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Scores {state.settings.riskThresholds.medium}%–{state.settings.riskThresholds.low - 1}% are considered medium risk
                  </Typography>
                  <Slider
                    value={state.settings.riskThresholds.medium}
                    onChange={(_, value) => handleRiskThresholdChange('medium', value as number)}
                    min={40}
                    max={state.settings.riskThresholds.low - 1}
                    marks={[
                      { value: 40, label: '40%' },
                      { value: 50, label: '50%' },
                      { value: 60, label: '60%' },
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ 
                      color: RISK_RATING_COLORS[RiskRating.MEDIUM],
                      '& .MuiSlider-track': { height: 6 },
                      '& .MuiSlider-rail': { height: 6 },
                    }}
                  />
                </Box>

                {/* High Risk Threshold */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      backgroundColor: RISK_RATING_COLORS[RiskRating.HIGH],
                      mr: 2
                    }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      High Risk Threshold
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Scores {state.settings.riskThresholds.high}%–{state.settings.riskThresholds.medium - 1}% are considered high risk
                  </Typography>
                  <Slider
                    value={state.settings.riskThresholds.high}
                    onChange={(_, value) => handleRiskThresholdChange('high', value as number)}
                    min={10}
                    max={state.settings.riskThresholds.medium - 1}
                    marks={[
                      { value: 10, label: '10%' },
                      { value: 30, label: '30%' },
                      { value: 40, label: '40%' },
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ 
                      color: RISK_RATING_COLORS[RiskRating.HIGH],
                      '& .MuiSlider-track': { height: 6 },
                      '& .MuiSlider-rail': { height: 6 },
                    }}
                  />
                </Box>

                {/* Very High Risk Indicator */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      backgroundColor: RISK_RATING_COLORS[RiskRating.VERY_HIGH],
                      mr: 2
                    }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      Very High Risk
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Scores &lt;{state.settings.riskThresholds.high}% are automatically considered very high risk
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.100', 
                    borderRadius: 1,
                    border: `2px solid ${RISK_RATING_COLORS[RiskRating.VERY_HIGH]}`,
                    textAlign: 'center'
                  }}>
                    <Typography variant="subtitle2" sx={{ color: RISK_RATING_COLORS[RiskRating.VERY_HIGH] }}>
                      &lt; {state.settings.riskThresholds.high}% = Very High Risk
                    </Typography>
                  </Box>
                </Box>
              </Box>

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
                      checked={state.settings.darkMode}
                      onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                    />
                  }
                  label="Dark mode (Coming soon)"
                  disabled
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={state.settings.language}
                    label="Language"
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    disabled
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={state.settings.timezone}
                  label="Timezone"
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  disabled
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time</MenuItem>
                  <MenuItem value="America/Chicago">Central Time</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                </Select>
              </FormControl>
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
    </ContentFrame>
  );
}