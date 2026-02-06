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
  MenuBook as MenuBookIcon,
  Build as BuildIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const dockerCommand = 'curl -fsSL https://get.metricframe.ai/install.sh | bash';
const secureInstallCommand = `# Download and verify before running
curl -fsSL https://get.metricframe.ai/install.sh -o install.sh
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
                        label="Install Files Verified"
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
                    wordBreak: 'break-all',
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
                      disabled
                      startIcon={<CloudDownloadIcon />}
                      sx={{
                        py: 1,
                        borderColor: alpha('#fff', 0.1),
                        color: alpha('#fff', 0.3),
                        fontSize: '0.8rem',
                        '&.Mui-disabled': {
                          borderColor: alpha('#fff', 0.1),
                          color: alpha('#fff', 0.3),
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
                      disabled
                      sx={{
                        py: 1,
                        borderColor: alpha('#fff', 0.1),
                        color: alpha('#fff', 0.3),
                        fontSize: '0.75rem',
                        '&.Mui-disabled': {
                          borderColor: alpha('#fff', 0.1),
                          color: alpha('#fff', 0.3),
                        },
                      }}
                    >
                      SHA256
                    </Button>
                  </Grid>
                </Grid>

                <Typography variant="caption" color={alpha('#fff', 0.4)} display="block" mt={1} fontStyle="italic">
                  Offline bundle coming soon
                </Typography>

                <Box mt={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled
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
                    View Source on GitHub
                  </Button>
                  <Typography
                    variant="caption"
                    color={alpha('#fff', 0.4)}
                    display="block"
                    textAlign="center"
                    mt={1}
                    fontStyle="italic"
                  >
                    We're working on providing open access to the repository
                  </Typography>
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


        {/* Docker Setup Details */}
        <Box mt={8}>
          <Typography variant="h4" color="white" mb={1} textAlign="center" fontWeight={600}>
            Docker Setup Guide
          </Typography>
          <Typography variant="body1" color={alpha('#fff', 0.5)} mb={4} textAlign="center">
            Everything you need to get MetricFrame running with Docker
          </Typography>

          <Grid container spacing={3}>
            {/* Prerequisites */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  background: alpha('#fff', 0.04),
                  border: `1px solid ${alpha('#fff', 0.08)}`,
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <BuildIcon sx={{ color: '#0ea5e9', fontSize: 24 }} />
                    <Typography variant="h6" color="white" fontWeight={600} fontSize="1rem">
                      Prerequisites
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ color: alpha('#fff', 0.7), pl: 2, m: 0, '& li': { mb: 1 } }}>
                    <li>Docker 20.10+ with Docker Compose v2</li>
                    <li>4 GB RAM minimum (8 GB recommended)</li>
                    <li>2 GB free disk space</li>
                    <li>No root/sudo required</li>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* What Gets Installed */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  background: alpha('#fff', 0.04),
                  border: `1px solid ${alpha('#fff', 0.08)}`,
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <StorageIcon sx={{ color: '#22c55e', fontSize: 24 }} />
                    <Typography variant="h6" color="white" fontWeight={600} fontSize="1rem">
                      What Gets Installed
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ color: alpha('#fff', 0.7), pl: 2, m: 0, '& li': { mb: 1 } }}>
                    <li>React frontend served by nginx</li>
                    <li>FastAPI backend (4 workers)</li>
                    <li>PostgreSQL 15 database</li>
                    <li>Redis session store</li>
                    <li>356 pre-configured metrics seeded</li>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* After Install */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  background: alpha('#fff', 0.04),
                  border: `1px solid ${alpha('#fff', 0.08)}`,
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <InfoIcon sx={{ color: '#f59e0b', fontSize: 24 }} />
                    <Typography variant="h6" color="white" fontWeight={600} fontSize="1rem">
                      After Installation
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ color: alpha('#fff', 0.7), pl: 2, m: 0, '& li': { mb: 1 } }}>
                    <li>Open <strong style={{ color: '#0ea5e9' }}>http://localhost:3000</strong></li>
                    <li>Create your admin account</li>
                    <li>Save the recovery key (shown once)</li>
                    <li>Configure AI provider in Settings</li>
                    <li>Explore the dashboard and 356 metrics</li>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Useful Commands */}
          <Box
            sx={{
              mt: 3,
              p: 3,
              background: alpha('#fff', 0.03),
              border: `1px solid ${alpha('#fff', 0.08)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" color={alpha('#fff', 0.6)} mb={2}>
              Useful Commands
            </Typography>
            <Grid container spacing={2}>
              {[
                { cmd: 'docker compose logs -f', desc: 'View logs' },
                { cmd: 'docker compose down', desc: 'Stop MetricFrame' },
                { cmd: 'docker compose pull && docker compose up -d', desc: 'Update to latest' },
                { cmd: 'docker compose down -v', desc: 'Reset (deletes data)' },
              ].map((item) => (
                <Grid item xs={12} sm={6} key={item.cmd}>
                  <Box display="flex" alignItems="baseline" gap={1}>
                    <Box
                      component="code"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#0ea5e9',
                        bgcolor: alpha('#000', 0.3),
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.cmd}
                    </Box>
                    <Typography variant="caption" color={alpha('#fff', 0.4)}>
                      {item.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>

        {/* Desktop App Details */}
        <Box mt={8}>
          <Typography variant="h4" color="white" mb={1} textAlign="center" fontWeight={600}>
            Desktop App
          </Typography>
          <Typography variant="body1" color={alpha('#fff', 0.5)} mb={4} textAlign="center">
            Standalone application — currently in development
          </Typography>

          <Card
            sx={{
              background: alpha('#fff', 0.03),
              border: `1px solid ${alpha('#f59e0b', 0.15)}`,
              borderRadius: 2,
              maxWidth: 800,
              mx: 'auto',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" color="white" fontWeight={600} mb={2}>
                    Planned Features
                  </Typography>
                  <Box component="ul" sx={{ color: alpha('#fff', 0.6), pl: 2, m: 0, '& li': { mb: 1.5 } }}>
                    <li>One-click install — no Docker or technical setup needed</li>
                    <li>Built-in SQLite database — everything runs locally</li>
                    <li>Automatic updates</li>
                    <li>Single-user mode — no login required</li>
                    <li>Offline-capable — no internet needed after install</li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" color="white" fontWeight={600} mb={2}>
                    Platform Status
                  </Typography>
                  <Box sx={{ '& > div': { mb: 2 } }}>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <AppleIcon sx={{ fontSize: 18, color: alpha('#fff', 0.5) }} />
                        <Typography variant="body2" color={alpha('#fff', 0.7)} fontWeight={500}>
                          macOS
                        </Typography>
                        <Chip label="In Progress" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha('#f59e0b', 0.2), color: '#f59e0b' }} />
                      </Box>
                      <Typography variant="caption" color={alpha('#fff', 0.4)} display="block" pl={3.5}>
                        Apple Developer certification is being obtained. Code signing and notarization will be completed before release.
                      </Typography>
                    </Box>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <WindowsIcon sx={{ fontSize: 18, color: alpha('#fff', 0.5) }} />
                        <Typography variant="body2" color={alpha('#fff', 0.7)} fontWeight={500}>
                          Windows
                        </Typography>
                        <Chip label="Planned" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha('#fff', 0.1), color: alpha('#fff', 0.4) }} />
                      </Box>
                      <Typography variant="caption" color={alpha('#fff', 0.4)} display="block" pl={3.5}>
                        Windows build with installer will follow the macOS release.
                      </Typography>
                    </Box>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <LinuxIcon sx={{ fontSize: 18, color: alpha('#fff', 0.5) }} />
                        <Typography variant="body2" color={alpha('#fff', 0.7)} fontWeight={500}>
                          Linux
                        </Typography>
                        <Chip label="Planned" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha('#fff', 0.1), color: alpha('#fff', 0.4) }} />
                      </Box>
                      <Typography variant="caption" color={alpha('#fff', 0.4)} display="block" pl={3.5}>
                        AppImage format for broad Linux distribution compatibility.
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 3 }} />

              <Typography variant="body2" color={alpha('#fff', 0.5)} textAlign="center" fontStyle="italic">
                The desktop app will include all the same features as the Docker version.
                Use Docker in the meantime — it's production-ready and fully supported.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Documentation */}
        <Box mt={8}>
          <Card
            sx={{
              background: alpha('#fff', 0.04),
              border: `1px solid ${alpha('#fff', 0.08)}`,
              borderRadius: 3,
              maxWidth: 700,
              mx: 'auto',
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
              '&:hover': {
                borderColor: alpha('#0ea5e9', 0.4),
                transform: 'translateY(-2px)',
              },
            }}
            onClick={() => navigate('/wiki')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <MenuBookIcon sx={{ fontSize: 48, color: '#0ea5e9', mb: 2 }} />
              <Typography variant="h4" color="white" fontWeight={600} mb={1}>
                Documentation
              </Typography>
              <Typography variant="body1" color={alpha('#fff', 0.6)} mb={3}>
                Guides, references, and tutorials covering everything from setup to
                scoring methodology, AI configuration, and API reference.
              </Typography>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: alpha('#0ea5e9', 0.5),
                  color: '#0ea5e9',
                  px: 4,
                  '&:hover': {
                    borderColor: '#0ea5e9',
                    backgroundColor: alpha('#0ea5e9', 0.1),
                  },
                }}
              >
                Browse Documentation
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Requirements Section */}
        <Box mt={8}>
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
