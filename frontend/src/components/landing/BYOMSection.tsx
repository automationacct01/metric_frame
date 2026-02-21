/**
 * Bring Your Own Model (BYOM) Section
 *
 * Dedicated section highlighting multi-AI provider support.
 */

import { Box, Container, Typography, Grid, Chip } from '@mui/material';
import {
  LockOutlined,
  SyncAltOutlined,
  BoltOutlined,
  CloudOutlined,
} from '@mui/icons-material';

const providers = [
  {
    name: 'Anthropic',
    description: 'Claude Opus, Sonnet & Haiku 4.5',
    color: '#D4A574',
    models: ['Claude Opus 4.5', 'Claude Sonnet 4.5', 'Claude Haiku 4.5'],
    moreCount: 2,
  },
  {
    name: 'OpenAI',
    description: 'GPT-5 Family',
    color: '#10A37F',
    models: ['GPT-5.2', 'GPT-5.2 Codex', 'GPT-5', 'GPT-5 Pro'],
    moreCount: 4,
  },
  {
    name: 'Together.ai',
    description: 'Open Source Models',
    color: '#6366F1',
    models: ['DeepSeek R1', 'Qwen3 Coder', 'Llama 4', 'Mistral'],
    moreCount: 20,
  },
  {
    name: 'Azure AI Foundry',
    description: 'Multi-Model Access',
    color: '#00BCF2',
    models: ['GPT-5 Family', 'DeepSeek-R1', 'Llama 4'],
    moreCount: 5,
  },
  {
    name: 'AWS Bedrock',
    description: 'Multi-Model Access',
    color: '#FF9900',
    models: ['Claude 4.5', 'Amazon Nova', 'Llama 4'],
    moreCount: 8,
  },
  {
    name: 'GCP Vertex AI',
    description: 'Gemini & Partners',
    color: '#EA4335',
    models: ['Gemini 3 Pro', 'Gemini 2.5', 'Claude 4.5'],
    moreCount: 6,
  },
];

export default function BYOMSection() {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: '#f8fafc',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Chip
            label="BRING YOUR OWN MODEL"
            sx={{
              backgroundColor: '#D4A574',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.75rem',
              letterSpacing: 1,
              mb: 2,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.5rem' },
              mt: 1,
              mb: 2,
            }}
          >
            Your AI, Your Choice
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 700,
              mx: 'auto',
              fontSize: '1.1rem',
              lineHeight: 1.7,
            }}
          >
            MetricFrame supports 6 major AI providers out of the box. Use your existing API keys,
            choose your preferred models, and switch providers anytime—no vendor lock-in.
          </Typography>
        </Box>

        {/* Provider Cards */}
        <Grid container spacing={3}>
          {providers.map((provider) => (
            <Grid item xs={12} sm={6} md={4} key={provider.name}>
              <Box
                sx={{
                  backgroundColor: '#fff',
                  borderRadius: 3,
                  p: 3,
                  height: '100%',
                  borderLeft: `4px solid ${provider.color}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 0.5,
                    color: '#1e293b',
                  }}
                >
                  {provider.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mb: 2,
                  }}
                >
                  {provider.description}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {provider.models.map((model) => (
                    <Chip
                      key={model}
                      label={model}
                      size="small"
                      sx={{
                        backgroundColor: `${provider.color}15`,
                        color: provider.color,
                        fontWeight: 500,
                        fontSize: '0.7rem',
                      }}
                    />
                  ))}
                  {provider.moreCount > 0 && (
                    <Chip
                      label={`+${provider.moreCount} more`}
                      size="small"
                      sx={{
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        fontWeight: 500,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Bottom Benefits */}
        <Box
          sx={{
            mt: 6,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: { xs: 2, md: 4 },
          }}
        >
          {[
            { icon: <LockOutlined sx={{ fontSize: 20, color: '#64748b' }} />, text: 'Encrypted API Key Storage' },
            { icon: <SyncAltOutlined sx={{ fontSize: 20, color: '#64748b' }} />, text: 'Switch Providers Anytime' },
            { icon: <BoltOutlined sx={{ fontSize: 20, color: '#64748b' }} />, text: 'Latest Models Available' },
            { icon: <CloudOutlined sx={{ fontSize: 20, color: '#64748b' }} />, text: 'Enterprise Cloud Support' },
          ].map((benefit) => (
            <Box
              key={benefit.text}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: '#fff',
                px: 2.5,
                py: 1.5,
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {benefit.icon}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: '#334155',
                }}
              >
                {benefit.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
