/**
 * Hero Section
 *
 * Clean, minimal hero with headline, subheadline, and CTA.
 * Inspired by Shopify's landing page design.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Grid,
} from '@mui/material';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        pt: { xs: 8, md: 12 },
        pb: { xs: 10, md: 16 },
        backgroundColor: '#ffffff',
      }}
    >
      <Container maxWidth="md">
        {/* Centered Content */}
        <Box sx={{ textAlign: 'center' }}>
          {/* Headline */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              fontWeight: 700,
              lineHeight: 1.1,
              mb: 3,
              color: '#0f172a',
            }}
          >
            Manage AI and Cybersecurity Risk with Confidence
          </Typography>

          {/* Subheadline */}
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: '1.1rem', md: '1.35rem' },
              fontWeight: 400,
              lineHeight: 1.6,
              mb: 5,
              color: '#64748b',
              maxWidth: 680,
              mx: 'auto',
            }}
          >
            MetricFrame is the platform to track, measure, and report your cybersecurity and AI metrics aligned to NIST CSF 2.0 and AI RMF. Get started in minutes.
          </Typography>

          {/* CTA Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
              mb: 4,
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/download')}
              sx={{
                backgroundColor: '#0ea5e9',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#0284c7',
                },
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                const featuresSection = document.querySelector('#features');
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              sx={{
                px: 4,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                borderColor: '#0ea5e9',
                color: '#0ea5e9',
                '&:hover': {
                  borderColor: '#0284c7',
                  backgroundColor: 'rgba(14, 165, 233, 0.05)',
                },
              }}
            >
              Learn More
            </Button>
          </Box>

          {/* Trust Note */}
          <Typography
            variant="body2"
            sx={{
              color: '#94a3b8',
              fontSize: '0.875rem',
            }}
          >
            Self-hosted and private. Use your own AI API keys.
          </Typography>
        </Box>
      </Container>

      {/* Hero Images - Two Separate Dashboard Previews */}
      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Grid container spacing={3}>
          {/* NIST CSF 2.0 Browser Window */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Browser Chrome */}
              <Box
                sx={{
                  backgroundColor: '#f8fafc',
                  px: 1.5,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fca5a5' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fcd34d' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#86efac' }} />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    mx: 1,
                    px: 2,
                    py: 0.5,
                    backgroundColor: '#ffffff',
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  metricframe.ai/csf
                </Box>
              </Box>

              {/* CSF Dashboard Content */}
              <Box sx={{ backgroundColor: '#f5f5f5', p: { xs: 1.5, md: 2.5 } }}>
                <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0ea5e9' }} />
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    NIST CSF 2.0
                  </Typography>
                </Box>
                <Grid container spacing={1}>
                  {[
                    { name: 'Govern', score: 87, color: '#22c55e' },
                    { name: 'Identify', score: 92, color: '#22c55e' },
                    { name: 'Protect', score: 68, color: '#f59e0b' },
                    { name: 'Detect', score: 85, color: '#22c55e' },
                    { name: 'Respond', score: 45, color: '#ef4444' },
                    { name: 'Recover', score: 78, color: '#22c55e' },
                  ].map((item) => (
                    <Grid item xs={4} key={item.name}>
                      <Box
                        sx={{
                          backgroundColor: '#ffffff',
                          borderRadius: 1.5,
                          p: { xs: 1, md: 1.5 },
                          borderLeft: `3px solid ${item.color}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.55rem',
                            color: '#64748b',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: '1.25rem', md: '1.5rem' },
                            fontWeight: 700,
                            color: item.color,
                            lineHeight: 1.2,
                          }}
                        >
                          {item.score}%
                        </Typography>
                        <Box
                          sx={{
                            mt: 0.75,
                            height: 3,
                            backgroundColor: '#f1f5f9',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${item.score}%`,
                              height: '100%',
                              backgroundColor: item.color,
                              borderRadius: 2,
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Grid>

          {/* NIST AI RMF Browser Window */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Browser Chrome */}
              <Box
                sx={{
                  backgroundColor: '#f8fafc',
                  px: 1.5,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fca5a5' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fcd34d' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#86efac' }} />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    mx: 1,
                    px: 2,
                    py: 0.5,
                    backgroundColor: '#ffffff',
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  metricframe.ai/ai-rmf
                </Box>
              </Box>

              {/* AI RMF Dashboard Content */}
              <Box sx={{ backgroundColor: '#f5f5f5', p: { xs: 1.5, md: 2.5 } }}>
                <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    NIST AI RMF
                  </Typography>
                </Box>
                <Grid container spacing={1}>
                  {[
                    { name: 'Govern', score: 82, color: '#22c55e' },
                    { name: 'Map', score: 71, color: '#f59e0b' },
                    { name: 'Measure', score: 89, color: '#22c55e' },
                    { name: 'Manage', score: 65, color: '#f59e0b' },
                  ].map((item) => (
                    <Grid item xs={6} key={item.name}>
                      <Box
                        sx={{
                          backgroundColor: '#ffffff',
                          borderRadius: 1.5,
                          p: { xs: 1, md: 1.5 },
                          borderLeft: `3px solid ${item.color}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.55rem',
                            color: '#64748b',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: '1.25rem', md: '1.5rem' },
                            fontWeight: 700,
                            color: item.color,
                            lineHeight: 1.2,
                          }}
                        >
                          {item.score}%
                        </Typography>
                        <Box
                          sx={{
                            mt: 0.75,
                            height: 3,
                            backgroundColor: '#f1f5f9',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${item.score}%`,
                              height: '100%',
                              backgroundColor: item.color,
                              borderRadius: 2,
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
