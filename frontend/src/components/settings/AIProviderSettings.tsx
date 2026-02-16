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
  Warning as WarningIcon,
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
  local: '#22C55E',
};

/**
 * Detect if the app is running inside Docker and return the appropriate
 * default Ollama endpoint URL. In Docker, localhost inside the container
 * doesn't reach the host machine — need host.docker.internal instead.
 */
function getDefaultLocalEndpoint(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:11434/v1'; // Desktop app
  }
  // Both dev (5175) and prod (3000) run the backend inside Docker
  return 'http://host.docker.internal:11434/v1';
}

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

  // Local provider discovery state
  const [discoveredModels, setDiscoveredModels] = useState<Array<{model_id: string; display_name: string; description?: string}>>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);

  // Expanded provider cards
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  // Activation prompt dialog
  const [activationPromptOpen, setActivationPromptOpen] = useState(false);
  const [pendingActivationConfigId, setPendingActivationConfigId] = useState<string | null>(null);
  const [pendingActivationProviderName, setPendingActivationProviderName] = useState<string>('');
  const [pendingActivationValidated, setPendingActivationValidated] = useState<boolean>(false);

  // Clear credential state on unmount
  useEffect(() => {
    return () => {
      setCredentialValues({});
    };
  }, []);

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
    setShowPasswords({});
    // Reset discovery state
    setDiscoveredModels([]);
    setDiscoveryError(null);
    setConnectionTested(false);
    setConnectionValid(false);
    // Pre-fill local endpoint URL with Docker-aware default
    if (provider.dynamic_models) {
      setCredentialValues({ local_endpoint: getDefaultLocalEndpoint() });
      setSelectedModel('');
    } else {
      setCredentialValues({});
      setSelectedModel(provider.models?.[0]?.model_id || '');
    }
    setConfigDialogOpen(true);
  };

  const handleCloseConfigDialog = () => {
    setConfigDialogOpen(false);
    setSelectedProvider(null);
    setCredentialValues({});
    setSelectedModel('');
    // Reset discovery state
    setDiscoveredModels([]);
    setDiscoveryError(null);
    setConnectionTested(false);
    setConnectionValid(false);
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

      // Step 1: Save the configuration
      const savedConfig = await apiClient.createAIConfiguration(config, userId);
      const configId = savedConfig.id;
      const providerName = selectedProvider.name;

      handleCloseConfigDialog();

      // Step 2: Auto-validate the credentials
      let validationPassed = false;
      setValidating(true);
      try {
        const validationResult = await apiClient.validateAIConfiguration(configId);
        validationPassed = validationResult.valid;
      } catch (validationErr: any) {
        console.error('Validation failed:', validationErr);
      } finally {
        setValidating(false);
      }

      // Step 3: Always prompt to activate
      setPendingActivationConfigId(configId);
      setPendingActivationProviderName(providerName);
      setPendingActivationValidated(validationPassed);
      setActivationPromptOpen(true);

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

  const handleTestConnection = async () => {
    if (!selectedProvider || !selectedProvider.dynamic_models) return;

    const endpoint = credentialValues['local_endpoint']?.trim();
    if (!endpoint) {
      setDiscoveryError('Please enter an endpoint URL');
      return;
    }

    setDiscovering(true);
    setDiscoveryError(null);
    setDiscoveredModels([]);
    setConnectionTested(false);
    setConnectionValid(false);

    try {
      // Save/update config first (backend needs saved creds to discover models)
      const existingConfig = getConfigForProvider(selectedProvider.code);

      if (existingConfig) {
        await apiClient.updateAIConfiguration(existingConfig.id, {
          credentials: credentialValues,
        });
      } else {
        const config: AIConfigurationCreate = {
          provider_code: selectedProvider.code,
          credentials: credentialValues,
          model_id: undefined,
        };
        await apiClient.createAIConfiguration(config, userId);
        await loadData();
      }

      // Now discover models from the endpoint
      const models = await apiClient.discoverProviderModels(selectedProvider.code);

      setConnectionTested(true);
      setConnectionValid(true);
      setDiscoveredModels(models);

      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0].model_id);
      } else if (models.length === 0) {
        setDiscoveryError('Connected, but no models found. Pull a model first: ollama pull llama3.2');
      }
    } catch (err: any) {
      setConnectionTested(true);
      setConnectionValid(false);
      const detail = err.response?.data?.detail || '';
      if (detail.includes('not reachable') || detail.includes('Connection error') || detail.includes('Could not connect')) {
        setDiscoveryError('Could not reach the server. Is Ollama running? Try: ollama serve');
      } else {
        setDiscoveryError(detail || 'Connection failed. Check the endpoint URL and make sure the server is running.');
      }
    } finally {
      setDiscovering(false);
    }
  };

  const handleSaveAndActivateLocal = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    setError(null);

    try {
      const existingConfig = getConfigForProvider(selectedProvider.code);

      let configId: string;

      if (existingConfig) {
        // Config was already created during test-connection; just update model
        if (selectedModel) {
          await apiClient.updateAIConfiguration(existingConfig.id, {
            model_id: selectedModel,
          });
        }
        configId = existingConfig.id;
      } else {
        // No test was run; save fresh
        const config: AIConfigurationCreate = {
          provider_code: selectedProvider.code,
          credentials: credentialValues,
          model_id: selectedModel || undefined,
        };
        const savedConfig = await apiClient.createAIConfiguration(config, userId);
        configId = savedConfig.id;
      }

      // Activate immediately
      await apiClient.activateAIConfiguration(configId);

      handleCloseConfigDialog();
      setSuccess(`${selectedProvider.name} is now active! Using model: ${selectedModel || 'auto-detect'}`);
      await loadData();
    } catch (err: any) {
      console.error('Failed to save and activate local provider:', err);
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscoverModelsForCard = async (providerCode: string) => {
    setDiscovering(true);
    setDiscoveryError(null);

    try {
      const models = await apiClient.discoverProviderModels(providerCode);
      setDiscoveredModels(models);
      if (models.length === 0) {
        setDiscoveryError('Connected but no models found. Pull a model first: ollama pull llama3.2');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setDiscoveryError(detail || 'Could not connect to the local model server.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleActivationPromptResponse = async (activate: boolean) => {
    setActivationPromptOpen(false);

    if (activate && pendingActivationConfigId) {
      try {
        await apiClient.activateAIConfiguration(pendingActivationConfigId);
        setSuccess(`${pendingActivationProviderName} has been activated and is ready to use!`);
        await loadData();
      } catch (err: any) {
        console.error('Activation failed:', err);
        setError(err.response?.data?.detail || 'Failed to activate provider');
      }
    } else {
      setSuccess(`${pendingActivationProviderName} credentials saved. You can activate it later.`);
    }

    setPendingActivationConfigId(null);
    setPendingActivationProviderName('');
    setPendingActivationValidated(false);
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
          autoComplete="off"
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
        autoComplete="off"
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
          const isComingSoon = provider.code === 'local';

          return (
            <Grid item xs={12} md={6} lg={4} key={provider.code}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: `4px solid ${PROVIDER_COLORS[provider.code] || '#888'}`,
                  opacity: (provider.available !== false && !isComingSoon) ? 1 : 0.5,
                }}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{provider.name}</Typography>
                      {isComingSoon && (
                        <Chip
                          size="small"
                          label="Coming Soon"
                          color="default"
                          variant="outlined"
                        />
                      )}
                      {isActive && !isComingSoon && (
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
                <CardContent sx={{ flexGrow: 1 }}>
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
                      label={provider.dynamic_models ? 'Dynamic models' : `${provider.models?.length || 0} models`}
                      variant="outlined"
                      color={provider.dynamic_models ? 'info' : undefined}
                    />
                  </Box>

                  {/* Expanded Config Details */}
                  <Collapse in={isExpanded && isConfigured}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {config && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Model:</strong> {config.model_id || 'Auto-detect'}
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

                          {/* Local Provider: Discover & Switch Models */}
                          {provider.dynamic_models && (
                            <Box sx={{ mt: 2 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleDiscoverModelsForCard(provider.code)}
                                disabled={discovering}
                                startIcon={discovering ? <CircularProgress size={14} /> : <RefreshIcon />}
                                sx={{ mb: 1 }}
                              >
                                {discovering ? 'Discovering...' : 'Refresh Models'}
                              </Button>

                              {discoveryError && (
                                <Alert severity="warning" sx={{ mt: 1 }} variant="outlined">
                                  <Typography variant="caption">{discoveryError}</Typography>
                                </Alert>
                              )}

                              {discoveredModels.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                    Available models (click to switch):
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {discoveredModels.map((m) => (
                                      <Chip
                                        key={m.model_id}
                                        label={m.model_id}
                                        size="small"
                                        variant={config.model_id === m.model_id ? 'filled' : 'outlined'}
                                        color={config.model_id === m.model_id ? 'primary' : 'default'}
                                        onClick={async () => {
                                          try {
                                            await apiClient.updateAIConfiguration(config.id, { model_id: m.model_id });
                                            setSuccess(`Model changed to ${m.model_id}`);
                                            await loadData();
                                          } catch (err: any) {
                                            setError('Failed to update model');
                                          }
                                        }}
                                        sx={{ cursor: 'pointer' }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  {isComingSoon ? (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      Future enhancement coming
                    </Typography>
                  ) : isConfigured ? (
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
                        <span>
                          <IconButton
                            onClick={() => handleActivateConfiguration(config!.id)}
                            disabled={isActive}
                            size="small"
                            color={isActive ? 'primary' : 'default'}
                          >
                            {isActive ? <StarIcon /> : <StarBorderIcon />}
                          </IconButton>
                        </span>
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
                {selectedProvider.dynamic_models ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Connect to a model running on your own machine. No API key or billing required.
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enter your credentials for {selectedProvider.name}. Your credentials will be
                    encrypted and stored securely.
                  </Typography>
                )}

                {/* Billing reminder — only for cloud providers */}
                {!selectedProvider.dynamic_models && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Your API account must have available credits or an active billing plan for credential validation to succeed.
                  </Alert>
                )}

                {/* Quick-start guide for local models */}
                {selectedProvider.dynamic_models && (
                  <Alert severity="success" icon={false} sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Quick Start
                    </Typography>
                    <Typography variant="body2" component="div">
                      <strong>1.</strong> Install <strong>Ollama</strong> from <strong>ollama.com</strong> (or <code>brew install ollama</code> on macOS)<br />
                      <strong>2.</strong> Pull a model: <code>ollama pull llama3.2</code><br />
                      <strong>3.</strong> Start the server: <code>ollama serve</code><br />
                      <strong>4.</strong> Click <strong>Test Connection</strong> below, pick a model, and activate
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                      <strong>Linux + Docker:</strong> Ollama must listen on the Docker bridge —
                      run <code>OLLAMA_HOST=172.17.0.1 ollama serve</code> instead of plain <code>ollama serve</code>.
                      macOS and Windows work without changes.
                    </Typography>
                  </Alert>
                )}

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

                {/* Local Provider: Test Connection + Model Picker */}
                {selectedProvider.dynamic_models && (
                  <Box sx={{ mt: 2 }}>
                    {/* Test Connection Button */}
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={handleTestConnection}
                      disabled={discovering || !credentialValues['local_endpoint']?.trim()}
                      startIcon={discovering ? <CircularProgress size={18} /> : <RefreshIcon />}
                      color={connectionTested ? (connectionValid ? 'success' : 'error') : 'primary'}
                      sx={{ mb: 2, py: 1.2 }}
                    >
                      {discovering
                        ? 'Connecting...'
                        : connectionTested
                          ? (connectionValid
                            ? `Connected — ${discoveredModels.length} model${discoveredModels.length !== 1 ? 's' : ''} found`
                            : 'Connection Failed — Retry')
                          : 'Test Connection & Discover Models'}
                    </Button>

                    {/* Discovery Error */}
                    {discoveryError && (
                      <Alert severity={connectionValid ? 'warning' : 'error'} sx={{ mb: 2 }}>
                        {discoveryError}
                      </Alert>
                    )}

                    {/* Discovered Models Selector */}
                    {discoveredModels.length > 0 && (
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Select Model</InputLabel>
                        <Select
                          value={selectedModel}
                          label="Select Model"
                          onChange={(e) => setSelectedModel(e.target.value)}
                        >
                          {discoveredModels.map((model) => (
                            <MenuItem key={model.model_id} value={model.model_id}>
                              <Typography variant="body2">{model.display_name || model.model_id}</Typography>
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Choose the model to use for AI features
                        </FormHelperText>
                      </FormControl>
                    )}

                    {/* Fallback manual entry if connected but 0 models */}
                    {connectionTested && connectionValid && discoveredModels.length === 0 && (
                      <TextField
                        fullWidth
                        size="small"
                        label="Model Name"
                        placeholder="e.g., llama3.2:latest"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        helperText="No models found automatically. Enter the model name manually."
                        sx={{ mb: 2 }}
                      />
                    )}

                    {/* Docker hint — only before testing */}
                    {!connectionTested && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          The endpoint URL is pre-filled for your environment. If Ollama is running on a different machine, update the URL above.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseConfigDialog}>
                Cancel
              </Button>
              {selectedProvider?.dynamic_models ? (
                <Button
                  variant="contained"
                  onClick={handleSaveAndActivateLocal}
                  disabled={saving || (!connectionValid && !selectedModel)}
                  startIcon={saving ? <CircularProgress size={18} /> : <StarIcon />}
                  color="primary"
                >
                  {saving ? 'Saving...' : 'Save & Activate'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSaveConfiguration}
                  disabled={saving || validating}
                >
                  {saving ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Saving...
                    </>
                  ) : validating ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Validating...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Activation Prompt Dialog */}
      <Dialog
        open={activationPromptOpen}
        onClose={() => handleActivationPromptResponse(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {pendingActivationValidated ? (
              <><CheckIcon color="success" />{pendingActivationProviderName === 'Local Models' ? 'Connection Verified' : 'Credentials Validated'}</>
            ) : (
              <><WarningIcon color="warning" />{pendingActivationProviderName === 'Local Models' ? 'Configuration Saved' : 'Credentials Saved'}</>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {pendingActivationValidated ? (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Your {pendingActivationProviderName} {pendingActivationProviderName === 'Local Models' ? 'connection' : 'credentials'} validated successfully.
            </Typography>
          ) : pendingActivationProviderName === 'Local Models' ? (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Your endpoint has been saved but the server could not be reached. Make sure your local model server is running (e.g., <code>ollama serve</code>) and try again. You can still activate the provider now and connect later.
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Your {pendingActivationProviderName} credentials have been saved but validation failed. This may be due to billing limits or network issues. You can still activate the provider and retry validation later.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Would you like to activate this provider now? Activating will make it your default AI provider for the assistant.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleActivationPromptResponse(false)}>
            Not Now
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleActivationPromptResponse(true)}
            startIcon={<StarIcon />}
          >
            Activate Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Web Search Settings */}
      <Card sx={{ mt: 3 }}>
        <CardHeader
          title="Web Search"
          subheader="Allow the AI assistant to search the web for current information"
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            When enabled, the AI assistant can search the web for real-time information in <strong>Explain</strong> and <strong>Report</strong> modes.
            This does not affect metric generation, catalog operations, or recommendations — those use internal data only.
          </Typography>
          <Alert severity="info" sx={{ mb: 1 }}>
            Web search uses DuckDuckGo by default (free, no configuration needed).
            For higher quality AI-optimized results, set a <code>TAVILY_API_KEY</code> in your environment.
          </Alert>
          <Typography variant="caption" color="text.secondary">
            Toggle web search per-conversation using the globe icon in the AI Chat input area.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
