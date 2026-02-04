/**
 * API Key Setup Component
 *
 * Onboarding component that prompts users to configure their AI provider API keys.
 * This is shown after framework selection to ensure users understand they need
 * to bring their own API keys.
 */

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Link,
  CircularProgress,
  InputAdornment,
  IconButton,
  Collapse,
  Chip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  Key as KeyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { apiClient } from '../../api/client';

// Provider configuration
interface ProviderConfig {
  code: string;
  name: string;
  description: string;
  placeholder: string;
  helpUrl: string;
  helpText: string;
  defaultModel: string;
  recommended?: boolean;
}

const PROVIDERS: ProviderConfig[] = [
  {
    code: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude excels at understanding security metrics and generating recommendations.',
    placeholder: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/account/keys',
    helpText: 'console.anthropic.com',
    defaultModel: 'claude-sonnet-4-20250514',
    recommended: true,
  },
  {
    code: 'openai',
    name: 'OpenAI',
    description: 'OpenAI provides excellent analysis and reporting capabilities.',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'platform.openai.com',
    defaultModel: 'gpt-4o',
  },
  {
    code: 'together',
    name: 'Together.ai',
    description: 'Together.ai offers fast inference with open-source models at competitive prices.',
    placeholder: 'your-together-api-key',
    helpUrl: 'https://api.together.xyz/settings/api-keys',
    helpText: 'api.together.xyz',
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
  },
  {
    code: 'azure_openai',
    name: 'Azure OpenAI',
    description: 'Enterprise-grade OpenAI models hosted on Microsoft Azure with compliance features.',
    placeholder: 'your-azure-api-key',
    helpUrl: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub',
    helpText: 'portal.azure.com',
    defaultModel: 'gpt-4o',
  },
  {
    code: 'bedrock',
    name: 'AWS Bedrock',
    description: 'Access foundation models through AWS with built-in security and compliance.',
    placeholder: 'Configure via AWS credentials',
    helpUrl: 'https://console.aws.amazon.com/bedrock/',
    helpText: 'AWS Console',
    defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  },
  {
    code: 'vertex',
    name: 'Google Vertex AI',
    description: 'Google Cloud AI platform with enterprise features and Gemini models.',
    placeholder: 'Configure via GCP credentials',
    helpUrl: 'https://console.cloud.google.com/vertex-ai',
    helpText: 'Google Cloud Console',
    defaultModel: 'gemini-1.5-pro',
  },
];

interface APIKeySetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function APIKeySetup({ onComplete, onSkip }: APIKeySetupProps) {
  // State for all provider keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean | null>>({});
  const [showMoreProviders, setShowMoreProviders] = useState(false);

  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateApiKey = (code: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [code]: value }));
    setValidationStatus(prev => ({ ...prev, [code]: null }));
  };

  const toggleShowKey = (code: string) => {
    setShowKeys(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleValidateAndSave = async () => {
    const providedKeys = Object.entries(apiKeys).filter(([_, value]) => value.trim());

    if (providedKeys.length === 0) {
      setError('Please enter at least one API key');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      for (const [providerCode, apiKey] of providedKeys) {
        const provider = PROVIDERS.find(p => p.code === providerCode);
        if (!provider) continue;

        const config = await apiClient.createAIConfiguration({
          provider_code: providerCode,
          model_id: provider.defaultModel,
          credentials: { api_key: apiKey },
        }, 'admin');

        const validation = await apiClient.validateAIConfiguration(config.id);
        setValidationStatus(prev => ({ ...prev, [providerCode]: validation.valid }));

        if (!validation.valid) {
          setError(`${provider.name} API key validation failed: ${validation.message || 'Unknown error'}`);
          setValidating(false);
          return;
        }
      }

      setValidating(false);
      setSaving(true);

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      onComplete();
    } catch (err: any) {
      console.error('Failed to save API configuration:', err);
      setError(err.message || 'Failed to save API configuration');
      setValidating(false);
      setSaving(false);
    }
  };

  const hasAnyKey = Object.values(apiKeys).some(key => key.trim());

  // Split providers into primary (first 2) and additional
  const primaryProviders = PROVIDERS.slice(0, 2);
  const additionalProviders = PROVIDERS.slice(2);

  const renderProviderInput = (provider: ProviderConfig) => (
    <Box key={provider.code} sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {provider.name}
        </Typography>
        {provider.recommended && (
          <Chip
            label="Recommended"
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
        {validationStatus[provider.code] === true && (
          <CheckCircleIcon color="success" fontSize="small" />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {provider.description}
      </Typography>
      <TextField
        fullWidth
        size="small"
        label={`${provider.name} API Key`}
        placeholder={provider.placeholder}
        type={showKeys[provider.code] ? 'text' : 'password'}
        value={apiKeys[provider.code] || ''}
        onChange={(e) => updateApiKey(provider.code, e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => toggleShowKey(provider.code)}
                edge="end"
                size="small"
              >
                {showKeys[provider.code] ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Get your API key from{' '}
        <Link href={provider.helpUrl} target="_blank" rel="noopener">
          {provider.helpText}
        </Link>
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        py: 8,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <KeyIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Configure AI Assistant
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            MetricFrame uses AI to help you manage and enhance your security metrics.
            You'll need to provide your own API key from one of our supported providers.
          </Typography>
        </Box>

        {/* Important Notice */}
        <Alert
          severity="info"
          icon={<WarningIcon />}
          sx={{ mb: 4, borderRadius: 2 }}
        >
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Bring Your Own API Key
          </Typography>
          <Typography variant="body2">
            MetricFrame does not include API keys. Your API keys are stored securely and encrypted
            on your local installation. We never have access to your keys or your data.
          </Typography>
        </Alert>

        {/* API Key Setup Card */}
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Primary Providers (Anthropic & OpenAI) */}
            {primaryProviders.map(renderProviderInput)}

            {/* Show More Providers Toggle */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Button
                variant="text"
                onClick={() => setShowMoreProviders(!showMoreProviders)}
                endIcon={showMoreProviders ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ color: 'text.secondary' }}
              >
                {showMoreProviders ? 'Show Fewer Providers' : 'Show More Providers'}
              </Button>
            </Box>

            {/* Additional Providers (Collapsible) */}
            <Collapse in={showMoreProviders}>
              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {additionalProviders.map(renderProviderInput)}
              </Box>
            </Collapse>

            {error && (
              <Alert severity="error" sx={{ mb: 3, mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mt: 4 }}>
              <Button
                variant="text"
                onClick={onSkip}
                disabled={validating || saving}
              >
                Skip for Now
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleValidateAndSave}
                disabled={!hasAnyKey || validating || saving}
                endIcon={
                  validating || saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <ArrowForwardIcon />
                  )
                }
                sx={{ px: 4 }}
              >
                {validating ? 'Validating...' : saving ? 'Saving...' : 'Continue'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Skip Notice */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: 'center' }}
        >
          You can configure API keys later in Settings. Some AI features will be unavailable
          until an API key is configured.
        </Typography>
      </Container>
    </Box>
  );
}

export default APIKeySetup;
