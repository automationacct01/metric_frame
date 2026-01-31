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
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  alpha,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import { apiClient } from '../../api/client';

interface APIKeySetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function APIKeySetup({ onComplete, onSkip }: APIKeySetupProps) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anthropicValid, setAnthropicValid] = useState<boolean | null>(null);
  const [openaiValid, setOpenaiValid] = useState<boolean | null>(null);

  const handleValidateAndSave = async () => {
    if (!anthropicKey && !openaiKey) {
      setError('Please enter at least one API key');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      // Validate and save Anthropic key if provided
      if (anthropicKey) {
        const config = await apiClient.createAIConfiguration({
          provider_id: 'anthropic',
          model_id: 'claude-sonnet-4-20250514',
          credentials: { api_key: anthropicKey },
          is_active: true,
        }, 'admin');

        // Validate the configuration
        const validation = await apiClient.validateAIConfiguration(config.id);
        setAnthropicValid(validation.valid);

        if (!validation.valid) {
          setError(`Anthropic API key validation failed: ${validation.error || 'Unknown error'}`);
          setValidating(false);
          return;
        }
      }

      // Validate and save OpenAI key if provided
      if (openaiKey) {
        const config = await apiClient.createAIConfiguration({
          provider_id: 'openai',
          model_id: 'gpt-4o',
          credentials: { api_key: openaiKey },
          is_active: !anthropicKey, // Only active if Anthropic not configured
        }, 'admin');

        const validation = await apiClient.validateAIConfiguration(config.id);
        setOpenaiValid(validation.valid);

        if (!validation.valid) {
          setError(`OpenAI API key validation failed: ${validation.error || 'Unknown error'}`);
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

  const hasAnyKey = anthropicKey || openaiKey;

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
            {/* Anthropic Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Anthropic Claude
                </Typography>
                <Chip
                  label="Recommended"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {anthropicValid === true && (
                  <CheckCircleIcon color="success" />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Claude excels at understanding security metrics and generating recommendations.
              </Typography>
              <TextField
                fullWidth
                label="Anthropic API Key"
                placeholder="sk-ant-api03-..."
                type={showAnthropicKey ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => {
                  setAnthropicKey(e.target.value);
                  setAnthropicValid(null);
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                        edge="end"
                      >
                        {showAnthropicKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Get your API key from{' '}
                <Link
                  href="https://console.anthropic.com/account/keys"
                  target="_blank"
                  rel="noopener"
                >
                  console.anthropic.com
                </Link>
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            {/* OpenAI Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  OpenAI
                </Typography>
                {openaiValid === true && (
                  <CheckCircleIcon color="success" />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                GPT-4 provides excellent analysis and reporting capabilities.
              </Typography>
              <TextField
                fullWidth
                label="OpenAI API Key"
                placeholder="sk-..."
                type={showOpenaiKey ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => {
                  setOpenaiKey(e.target.value);
                  setOpenaiValid(null);
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                        edge="end"
                      >
                        {showOpenaiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Get your API key from{' '}
                <Link
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener"
                >
                  platform.openai.com
                </Link>
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
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

        {/* Additional Providers */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            We also support Azure OpenAI, AWS Bedrock, Google Vertex AI, and Together.ai.
            <br />
            Configure additional providers in Settings after setup.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default APIKeySetup;
