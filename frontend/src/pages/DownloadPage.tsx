import { useState } from 'react';
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
  Security as SecurityIcon,
  Verified as VerifiedIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const dockerCommand = 'curl -fsSL https://raw.githubusercontent.com/automationacct01/metric_frame/main/install.sh | bash';
const secureInstallCommand = `# Download and verify before running (recommended)
curl -fsSL https://raw.githubusercontent.com/automationacct01/metric_frame/main/install.sh -o install.sh
less install.sh  # Review the script
chmod +x install.sh && ./install.sh`;
const offlineBundleUrl = 'https://github.com/automationacct01/metric_frame/releases/latest/download/metricframe-offline-bundle.tar.gz';
const checksumUrl = 'https://github.com/automationacct01/metric_frame/releases/latest/download/metricframe-offline-bundle.tar.gz.sha256';

export default function DownloadPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copiedSecure, setCopiedSecure] = useState(false);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySecureCommand = () => {
    navigator.clipboard.writeText(secureInstallCommand);
    setCopiedSecure(true);
    setTimeout(() => setCopiedSecure(false), 2000);
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
          {/* Docker Section - Primary */}
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
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip
                        label="Recommended"
                        size="small"
                        sx={{
                          bgcolor: alpha('#22c55e', 0.2),
                          color: '#22c55e',
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                        label="SHA256 Verified"
                        size="small"
                        sx={{
                          bgcolor: alpha('#22c55e', 0.2),
                          color: '#22c55e',
                          '& .MuiChip-icon': { color: '#22c55e' },
                        }}
                      />
                    </Box>
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

                {/* Quick Install */}
                <Typography variant="body2" color={alpha('#fff', 0.5)} mb={2}>
                  Quick install (one command):
                </Typography>

                <Box
                  sx={{
                    bgcolor: alpha('#000', 0.3),
                    borderRadius: 2,
                    p: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
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

                {/* Secure Install */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: alpha('#22c55e', 0.1),
                    border: `1px solid ${alpha('#22c55e', 0.3)}`,
                    borderRadius: 2,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <SecurityIcon sx={{ fontSize: 18, color: '#22c55e' }} />
                    <Typography variant="body2" color="#22c55e" fontWeight={600}>
                      Security-Conscious Install (Recommended)
                    </Typography>
                  </Box>
                  <Typography variant="caption" color={alpha('#fff', 0.6)} display="block" mb={1.5}>
                    Download, review the script, verify checksum, then run:
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: alpha('#000', 0.3),
                      borderRadius: 1,
                      p: 1.5,
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: alpha('#fff', 0.8),
                      position: 'relative',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {secureInstallCommand}
                    <Button
                      size="small"
                      onClick={handleCopySecureCommand}
                      sx={{
                        position: 'absolute',
                        right: 4,
                        top: 4,
                        minWidth: 'auto',
                        color: alpha('#fff', 0.7),
                      }}
                    >
                      {copiedSecure ? <CheckIcon sx={{ fontSize: 16 }} /> : <CopyIcon sx={{ fontSize: 16 }} />}
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: alpha('#fff', 0.1), my: 3 }} />

                {/* Offline Bundle */}
                <Typography variant="body2" color={alpha('#fff', 0.5)} mb={2}>
                  Offline installation (air-gapped networks):
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={8}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CloudDownloadIcon />}
                      href={offlineBundleUrl}
                      target="_blank"
                      sx={{
                        py: 1,
                        borderColor: alpha('#fff', 0.3),
                        color: alpha('#fff', 0.9),
                        fontSize: '0.8rem',
                        '&:hover': {
                          bgcolor: alpha('#fff', 0.1),
                          borderColor: alpha('#fff', 0.5),
                        },
                      }}
                    >
                      Download Bundle (.tar.gz)
                    </Button>
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      href={checksumUrl}
                      target="_blank"
                      sx={{
                        py: 1,
                        borderColor: alpha('#22c55e', 0.3),
                        color: '#22c55e',
                        fontSize: '0.75rem',
                        '&:hover': {
                          bgcolor: alpha('#22c55e', 0.1),
                          borderColor: '#22c55e',
                        },
                      }}
                    >
                      SHA256
                    </Button>
                  </Grid>
                </Grid>

                <Typography variant="caption" color={alpha('#fff', 0.4)} display="block" mt={1}>
                  Includes Docker images for offline deployment
                </Typography>

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
                    View Source on GitHub
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

          {/* Desktop App Section - Coming Soon */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                background: alpha('#fff', 0.03),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha('#fff', 0.08)}`,
                borderRadius: 3,
                opacity: 0.85,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <DownloadIcon sx={{ fontSize: 40, color: alpha('#f59e0b', 0.7) }} />
                  <Box>
                    <Typography variant="h5" color="white" fontWeight={600}>
                      Desktop App
                    </Typography>
                    <Chip
                      label="Coming Soon"
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: alpha('#f59e0b', 0.2),
                        color: '#f59e0b',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>

                <Typography color={alpha('#fff', 0.7)} mb={3}>
                  Desktop app with built-in database is under active development.
                  Use Docker for now — it includes all the same features.
                </Typography>

                <Box mb={3}>
                  <Typography variant="body2" color={alpha('#fff', 0.5)} mb={1}>
                    Planned features:
                  </Typography>
                  <Box component="ul" sx={{ color: alpha('#fff', 0.5), pl: 2, m: 0 }}>
                    <li>One-click installation</li>
                    <li>Automatic updates</li>
                    <li>Local SQLite database</li>
                    <li>Works offline</li>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: alpha('#fff', 0.1), my: 3 }} />

                <Typography variant="body2" color={alpha('#fff', 0.4)} mb={2}>
                  Download for your platform:
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled
                      startIcon={<AppleIcon />}
                      sx={{
                        py: 1.5,
                        borderColor: alpha('#fff', 0.1),
                        color: alpha('#fff', 0.3),
                        '&.Mui-disabled': {
                          borderColor: alpha('#fff', 0.1),
                          color: alpha('#fff', 0.3),
                        },
                      }}
                    >
                      macOS (Apple Silicon)
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled
                      startIcon={<WindowsIcon />}
                      sx={{
                        py: 1.5,
                        borderColor: alpha('#fff', 0.1),
                        color: alpha('#fff', 0.3),
                        '&.Mui-disabled': {
                          borderColor: alpha('#fff', 0.1),
                          color: alpha('#fff', 0.3),
                        },
                      }}
                    >
                      Windows
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled
                      startIcon={<LinuxIcon />}
                      sx={{
                        py: 1.5,
                        borderColor: alpha('#fff', 0.1),
                        color: alpha('#fff', 0.3),
                        '&.Mui-disabled': {
                          borderColor: alpha('#fff', 0.1),
                          color: alpha('#fff', 0.3),
                        },
                      }}
                    >
                      Linux (AppImage)
                    </Button>
                  </Grid>
                </Grid>

                <Typography
                  variant="caption"
                  color={alpha('#fff', 0.3)}
                  display="block"
                  textAlign="center"
                  mt={3}
                >
                  Desktop releases will be available in a future update
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
