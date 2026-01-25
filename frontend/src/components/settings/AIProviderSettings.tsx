/**
 * AI Provider Settings Component
 *
 * Allows users to configure their AI provider credentials for the
 * "Bring Your Own Model" functionality. Supports multiple providers:
 * - Anthropic Claude
 * - OpenAI
 * - Together.ai
 * - Azure OpenAI
 * - AWS Bedrock
 * - GCP Vertex AI
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  InputAdornment,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiClient } from '../../api/client';
import {
  AIProvider,
  AIModel,
  AIConfiguration,
  AIConfigurationCreate,
  AuthField,
  AIProviderStatus,
} from '../../types';

// Provider icons/colors for visual distinction
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#D4A574',
  openai: '#10A37F',
  together: '#6366F1',
  azure: '#0078D4',
  bedrock: '#FF9900',
  vertex: '#4285F4',
};

interface AIProviderSettingsProps {
  userId?: string;
  onStatusChange?: (available: boolean) => void;
}

export default function AIProviderSettings({ userId = 'admin', onStatusChange }: AIProviderSettingsProps) {
  // State
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [configurations, setConfigurations] = useState<AIConfiguration[]>([]);
  const [status, setStatus] = useState<AIProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Expanded provider cards
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [providersData, configurationsData, statusData] = await Promise.all([
        apiClient.getAIProviders(),
        apiClient.getAIConfigurations(userId),
        apiClient.getAIProviderStatus(),
      ]);

      setProviders(providersData);
      setConfigurations(configurationsData);
      setStatus(statusData);

      if (onStatusChange) {
        onStatusChange(statusData.available);
      }
    } catch (err: any) {
      console.error('Failed to load AI provider data:', err);
      setError('Failed to load AI provider data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfigDialog = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setCredentialValues({});
    setSelectedModel(provider.models?.[0]?.model_id || '');
    setShowPasswords({});
    setConfigDialogOpen(true);
  };

  const handleCloseConfigDialog = () => {
    setConfigDialogOpen(false);
    setSelectedProvider(null);
    setCredentialValues({});
    setSelectedModel('');
  };

  const handleCredentialChange = (fieldName: string, value: string) => {
    setCredentialValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const handleSaveConfiguration = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    setError(null);

    try {
      const config: AIConfigurationCreate = {
        provider_code: selectedProvider.code,
        credentials: credentialValues,
        model_id: selectedModel || undefined,
      };

      await apiClient.createAIConfiguration(config, userId);
      setSuccess(`Successfully configured ${selectedProvider.name}`);
      handleCloseConfigDialog();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateConfiguration = async (configId: string) => {
    setValidating(true);
    setError(null);

    try {
      const result = await apiClient.validateAIConfiguration(configId);
      if (result.valid) {
        setSuccess('Credentials validated successfully!');
      } else {
        setError(result.message || 'Validation failed');
      }
      await loadData();
    } catch (err: any) {
      console.error('Validation failed:', err);
      setError(err.response?.data?.detail || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleActivateConfiguration = async (configId: string) => {
    try {
      await apiClient.activateAIConfiguration(configId);
      setSuccess('Provider activated successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Activation failed:', err);
      setError(err.response?.data?.detail || 'Failed to activate provider');
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await apiClient.deleteAIConfiguration(configId);
      setSuccess('Configuration deleted');
      await loadData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.response?.data?.detail || 'Failed to delete configuration');
    }
  };

  const toggleProviderExpanded = (providerCode: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerCode]: !prev[providerCode],
    }));
  };

  const getConfigForProvider = (providerCode: string): AIConfiguration | undefined => {
    return configurations.find(c => c.provider_code === providerCode);
  };

  const renderAuthField = (field: AuthField) => {
    const isPassword = field.type === 'password';
    const showPassword = showPasswords[field.name];

    if (field.type === 'select' && field.options) {
      return (
        <FormControl fullWidth key={field.name} sx={{ mb: 2 }}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={credentialValues[field.name] || field.default || ''}
            label={field.label}
            onChange={(e) => handleCredentialChange(field.name, e.target.value)}
            required={field.required}
          >
            {field.options.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
          {field.help_text && <FormHelperText>{field.help_text}</FormHelperText>}
        </FormControl>
      );
    }

    if (field.type === 'textarea') {
      return (
        <TextField
          key={field.name}
          fullWidth
          multiline
          rows={4}
          label={field.label}
          value={credentialValues[field.name] || ''}
          onChange={(e) => handleCredentialChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          helperText={field.help_text}
          required={field.required}
          sx={{ mb: 2 }}
        />
      );
    }

    return (
      <TextField
        key={field.name}
        fullWidth
        type={isPassword && !showPassword ? 'password' : 'text'}
        label={field.label}
        value={credentialValues[field.name] || ''}
        onChange={(e) => handleCredentialChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        helperText={field.help_text}
        required={field.required}
        sx={{ mb: 2 }}
        InputProps={isPassword ? {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => togglePasswordVisibility(field.name)}
                edge="end"
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        } : undefined}
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Status */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            AI Provider Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure your AI provider credentials for metrics analysis and recommendations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={loadData} size="small">
            <RefreshIcon />
          </IconButton>
          {status && (
            <Chip
              icon={status.available ? <CheckIcon /> : <CloseIcon />}
              label={status.available ? `Active: ${status.provider}` : 'No Provider Active'}
              color={status.available ? 'success' : 'default'}
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Dev Mode Notice */}
      {status?.dev_mode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Development Mode Active:</strong> Using {status.dev_provider} from environment variables.
          User configurations will override this when set.
        </Alert>
      )}

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Provider Cards */}
      <Grid container spacing={2}>
        {providers.map(provider => {
          const config = getConfigForProvider(provider.code);
          const isConfigured = !!config;
          const isActive = config?.is_active;
          const isValidated = config?.credentials_validated;
          const isExpanded = expandedProviders[provider.code];

          return (
            <Grid item xs={12} md={6} lg={4} key={provider.code}>
              <Card
                sx={{
                  height: '100%',
                  borderLeft: `4px solid ${PROVIDER_COLORS[provider.code] || '#888'}`,
                  opacity: provider.available !== false ? 1 : 0.6,
                }}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{provider.name}</Typography>
                      {isActive && (
                        <Chip
                          size="small"
                          icon={<StarIcon />}
                          label="Active"
                          color="primary"
                        />
                      )}
                    </Box>
                  }
                  subheader={provider.description}
                  action={
                    isConfigured && (
                      <IconButton onClick={() => toggleProviderExpanded(provider.code)}>
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )
                  }
                />
                <CardContent>
                  {/* Status Chips */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      size="small"
                      label={isConfigured ? 'Configured' : 'Not Configured'}
                      color={isConfigured ? 'success' : 'default'}
                      variant="outlined"
                    />
                    {isConfigured && (
                      <Chip
                        size="small"
                        label={isValidated ? 'Validated' : 'Not Validated'}
                        color={isValidated ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    )}
                    <Chip
                      size="small"
                      label={`${provider.models?.length || 0} models`}
                      variant="outlined"
                    />
                  </Box>

                  {/* Expanded Config Details */}
                  <Collapse in={isExpanded && isConfigured}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {config && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Model:</strong> {config.model_id || 'Default'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Last Validated:</strong>{' '}
                            {config.last_validated_at
                              ? new Date(config.last_validated_at).toLocaleString()
                              : 'Never'}
                          </Typography>
                          {config.validation_error && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              {config.validation_error}
                            </Alert>
                          )}
                        </>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  {isConfigured ? (
                    <>
                      <Tooltip title="Validate Credentials">
                        <IconButton
                          onClick={() => handleValidateConfiguration(config!.id)}
                          disabled={validating}
                          size="small"
                        >
                          {validating ? <CircularProgress size={20} /> : <CheckIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isActive ? 'Active Provider' : 'Set as Active'}>
                        <IconButton
                          onClick={() => handleActivateConfiguration(config!.id)}
                          disabled={isActive || !isValidated}
                          size="small"
                          color={isActive ? 'primary' : 'default'}
                        >
                          {isActive ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Configuration">
                        <IconButton
                          onClick={() => handleDeleteConfiguration(config!.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenConfigDialog(provider)}
                      disabled={provider.available === false}
                    >
                      Configure
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={handleCloseConfigDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedProvider && (
          <>
            <DialogTitle>
              Configure {selectedProvider.name}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Enter your credentials for {selectedProvider.name}. Your credentials will be
                  encrypted and stored securely.
                </Typography>

                {/* Credential Fields */}
                {selectedProvider.auth_fields.map(renderAuthField)}

                {/* Model Selection */}
                {selectedProvider.models && selectedProvider.models.length > 0 && (
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Default Model</InputLabel>
                    <Select
                      value={selectedModel}
                      label="Default Model"
                      onChange={(e) => setSelectedModel(e.target.value)}
                    >
                      {selectedProvider.models.map(model => (
                        <MenuItem key={model.model_id} value={model.model_id}>
                          <Box>
                            <Typography variant="body2">{model.display_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Context: {model.context_window?.toLocaleString() || 'N/A'} tokens
                              {model.supports_vision && ' | Vision'}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Select the default model to use with this provider
                    </FormHelperText>
                  </FormControl>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseConfigDialog}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveConfiguration}
                disabled={saving}
              >
                {saving ? <CircularProgress size={20} /> : 'Save Configuration'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
