import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Divider,
  alpha,
} from '@mui/material';
import {
  Apple as AppleIcon,
  Computer as WindowsIcon,
  Terminal as LinuxIcon,
  Cloud as DockerIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Release {
  version: string;
  date: string;
  assets: {
    mac?: string;
    macArm?: string;
    windows?: string;
    linux?: string;
  };
}

// This would be fetched from GitHub releases API in production
const latestRelease: Release = {
  version: '1.0.0',
  date: '2024-01-30',
  assets: {
    mac: 'https://github.com/automationacct01/metric_frame/releases/latest/download/MetricFrame-mac-x64.dmg',
    macArm: 'https://github.com/automationacct01/metric_frame/releases/latest/download/MetricFrame-mac-arm64.dmg',
    windows: 'https://github.com/automationacct01/metric_frame/releases/latest/download/MetricFrame-Setup.exe',
    linux: 'https://github.com/automationacct01/metric_frame/releases/latest/download/MetricFrame.AppImage',
  },
};

const dockerCommand = 'curl -fsSL https://raw.githubusercontent.com/automationacct01/metric_frame/main/quickstart.sh | bash';

export default function DownloadPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [detectedOS, setDetectedOS] = useState<'mac' | 'windows' | 'linux' | null>(null);

  useEffect(() => {
    // Detect user's operating system
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
      setDetectedOS('mac');
    } else if (platform.includes('win')) {
      setDetectedOS('windows');
    } else if (platform.includes('linux')) {
      setDetectedOS('linux');
    }
  }, []);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha('#0f172a', 0.97)} 0%, ${alpha('#1e3a5f', 0.97)} 100%)`,
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ color: 'white', mb: 4 }}
        >
          Back to Home
        </Button>

        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: 'white',
              mb: 2,
            }}
          >
            Download MetricFrame
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: alpha('#fff', 0.7),
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Choose your preferred installation method. Both options include the same features.
          </Typography>
        </Box>

        {/* API Key Notice */}
        <Box
          sx={{
            mb: 4,
            p: 3,
            background: alpha('#f59e0b', 0.1),
            border: `1px solid ${alpha('#f59e0b', 0.3)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" color="#fbbf24" fontWeight={600} gutterBottom textAlign="center">
            Bring Your Own API Key Required
          </Typography>
          <Typography variant="body2" color={alpha('#fff', 0.8)} textAlign="center" mb={2}>
            MetricFrame's AI features require your own API key. Choose from 6 supported providers.
            You'll be prompted to configure this during setup. Your keys are stored locally and never shared.
          </Typography>

          {/* Supported Providers */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 1.5,
              mt: 2,
            }}
          >
            {[
              { name: 'Anthropic', color: '#D4A574' },
              { name: 'OpenAI', color: '#10A37F' },
              { name: 'Together.ai', color: '#6366F1' },
              { name: 'Azure OpenAI', color: '#00BCF2' },
              { name: 'AWS Bedrock', color: '#FF9900' },
              { name: 'GCP Vertex AI', color: '#EA4335' },
            ].map((provider) => (
              <Chip
                key={provider.name}
                label={provider.name}
                size="small"
                sx={{
                  backgroundColor: alpha(provider.color, 0.2),
                  color: provider.color,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  border: `1px solid ${alpha(provider.color, 0.3)}`,
                }}
              />
            ))}
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* Desktop App Section */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                background: alpha('#fff', 0.05),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha('#fff', 0.1)}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <DownloadIcon sx={{ fontSize: 40, color: '#0ea5e9' }} />
                  <Box>
                    <Typography variant="h5" color="white" fontWeight={600}>
                      Desktop App
                    </Typography>
                    <Chip
                      label="Recommended for most users"
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: alpha('#0ea5e9', 0.2),
                        color: '#0ea5e9',
                      }}
                    />
                  </Box>
                </Box>

                <Typography color={alpha('#fff', 0.7)} mb={3}>
                  Standalone application with built-in database. No Docker or technical setup required.
                  Perfect for individual users and small teams.
                </Typography>

                <Box mb={3}>
                  <Typography variant="body2" color={alpha('#fff', 0.5)} mb={1}>
                    Features:
                  </Typography>
                  <Box component="ul" sx={{ color: alpha('#fff', 0.7), pl: 2, m: 0 }}>
                    <li>One-click installation</li>
                    <li>Automatic updates</li>
                    <li>Local SQLite database</li>
                    <li>Works offline</li>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: alpha('#fff', 0.1), my: 3 }} />

                <Typography variant="body2" color={alpha('#fff', 0.5)} mb={2}>
                  Download for your platform:
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant={detectedOS === 'mac' ? 'contained' : 'outlined'}
                      startIcon={<AppleIcon />}
                      onClick={() => latestRelease.assets.macArm && handleDownload(latestRelease.assets.macArm)}
                      sx={{
                        py: 1.5,
                        borderColor: alpha('#fff', 0.3),
                        color: detectedOS === 'mac' ? 'white' : alpha('#fff', 0.9),
                        bgcolor: detectedOS === 'mac' ? '#0ea5e9' : 'transparent',
                        '&:hover': {
                          bgcolor: detectedOS === 'mac' ? '#0284c7' : alpha('#fff', 0.1),
                          borderColor: alpha('#fff', 0.5),
                        },
                      }}
                    >
                      macOS (Apple Silicon)
                      {detectedOS === 'mac' && (
                        <Chip label="Detected" size="small" sx={{ ml: 1, height: 20 }} />
                      )}
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant={detectedOS === 'windows' ? 'contained' : 'outlined'}
                      startIcon={<WindowsIcon />}
                      onClick={() => latestRelease.assets.windows && handleDownload(latestRelease.assets.windows)}
                      sx={{
                        py: 1.5,
                        borderColor: alpha('#fff', 0.3),
                        color: detectedOS === 'windows' ? 'white' : alpha('#fff', 0.9),
                        bgcolor: detectedOS === 'windows' ? '#0ea5e9' : 'transparent',
                        '&:hover': {
                          bgcolor: detectedOS === 'windows' ? '#0284c7' : alpha('#fff', 0.1),
                          borderColor: alpha('#fff', 0.5),
                        },
                      }}
                    >
                      Windows
                      {detectedOS === 'windows' && (
                        <Chip label="Detected" size="small" sx={{ ml: 1, height: 20 }} />
                      )}
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant={detectedOS === 'linux' ? 'contained' : 'outlined'}
                      startIcon={<LinuxIcon />}
                      onClick={() => latestRelease.assets.linux && handleDownload(latestRelease.assets.linux)}
                      sx={{
                        py: 1.5,
                        borderColor: alpha('#fff', 0.3),
                        color: detectedOS === 'linux' ? 'white' : alpha('#fff', 0.9),
                        bgcolor: detectedOS === 'linux' ? '#0ea5e9' : 'transparent',
                        '&:hover': {
                          bgcolor: detectedOS === 'linux' ? '#0284c7' : alpha('#fff', 0.1),
                          borderColor: alpha('#fff', 0.5),
                        },
                      }}
                    >
                      Linux (AppImage)
                      {detectedOS === 'linux' && (
                        <Chip label="Detected" size="small" sx={{ ml: 1, height: 20 }} />
                      )}
                    </Button>
                  </Grid>
                </Grid>

                <Typography
                  variant="caption"
                  color={alpha('#fff', 0.4)}
                  display="block"
                  textAlign="center"
                  mt={2}
                >
                  Version {latestRelease.version} &bull; Released {latestRelease.date}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Docker Section */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                background: alpha('#fff', 0.05),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha('#fff', 0.1)}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <DockerIcon sx={{ fontSize: 40, color: '#0ea5e9' }} />
                  <Box>
                    <Typography variant="h5" color="white" fontWeight={600}>
                      Docker
                    </Typography>
                    <Chip
                      label="For servers & teams"
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: alpha('#0ea5e9', 0.2),
                        color: '#0ea5e9',
                      }}
                    />
                  </Box>
                </Box>

                <Typography color={alpha('#fff', 0.7)} mb={3}>
                  Self-hosted deployment with PostgreSQL. Ideal for servers, teams, and enterprise environments.
                </Typography>

                <Box mb={3}>
                  <Typography variant="body2" color={alpha('#fff', 0.5)} mb={1}>
                    Features:
                  </Typography>
                  <Box component="ul" sx={{ color: alpha('#fff', 0.7), pl: 2, m: 0 }}>
                    <li>PostgreSQL database</li>
                    <li>Multi-user support</li>
                    <li>Easy backup & restore</li>
                    <li>Horizontal scaling</li>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: alpha('#fff', 0.1), my: 3 }} />

                <Typography variant="body2" color={alpha('#fff', 0.5)} mb={2}>
                  Quick start with one command:
                </Typography>

                <Box
                  sx={{
                    bgcolor: alpha('#000', 0.3),
                    borderRadius: 2,
                    p: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#0ea5e9',
                    position: 'relative',
                    overflowX: 'auto',
                  }}
                >
                  <code>{dockerCommand}</code>
                  <Button
                    size="small"
                    onClick={handleCopyCommand}
                    sx={{
                      position: 'absolute',
                      right: 8,
                      top: 8,
                      minWidth: 'auto',
                      color: alpha('#fff', 0.7),
                    }}
                  >
                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </Button>
                </Box>

                <Typography variant="body2" color={alpha('#fff', 0.5)} mt={3} mb={2}>
                  Or use Docker Compose:
                </Typography>

                <Box
                  sx={{
                    bgcolor: alpha('#000', 0.3),
                    borderRadius: 2,
                    p: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: alpha('#fff', 0.7),
                  }}
                >
                  <code>
                    git clone https://github.com/automationacct01/metric_frame.git<br />
                    cd metricframe<br />
                    docker compose -f docker-compose.prod.yml up -d
                  </code>
                </Box>

                <Box mt={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    href="https://github.com/automationacct01/metric_frame"
                    target="_blank"
                    sx={{
                      py: 1.5,
                      borderColor: alpha('#fff', 0.3),
                      color: alpha('#fff', 0.9),
                      '&:hover': {
                        bgcolor: alpha('#fff', 0.1),
                        borderColor: alpha('#fff', 0.5),
                      },
                    }}
                  >
                    View on GitHub
                  </Button>
                </Box>

                <Typography
                  variant="caption"
                  color={alpha('#fff', 0.4)}
                  display="block"
                  textAlign="center"
                  mt={2}
                >
                  Requires Docker Desktop or Docker Engine
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>


        {/* Requirements Section */}
        <Box mt={6}>
          <Typography variant="h6" color="white" mb={3} textAlign="center">
            System Requirements
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <AppleIcon sx={{ fontSize: 32, color: alpha('#fff', 0.5), mb: 1 }} />
                <Typography color="white" fontWeight={500}>macOS</Typography>
                <Typography variant="body2" color={alpha('#fff', 0.5)}>
                  macOS 10.15 (Catalina) or later<br />
                  Apple Silicon or Intel
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <WindowsIcon sx={{ fontSize: 32, color: alpha('#fff', 0.5), mb: 1 }} />
                <Typography color="white" fontWeight={500}>Windows</Typography>
                <Typography variant="body2" color={alpha('#fff', 0.5)}>
                  Windows 10 or later<br />
                  64-bit
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <LinuxIcon sx={{ fontSize: 32, color: alpha('#fff', 0.5), mb: 1 }} />
                <Typography color="white" fontWeight={500}>Linux</Typography>
                <Typography variant="body2" color={alpha('#fff', 0.5)}>
                  Ubuntu 20.04+ or equivalent<br />
                  64-bit with FUSE support
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
