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
            Manage cybersecurity risk with confidence
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
            MetricFrame is the platform to track, measure, and report your security metrics aligned to NIST CSF 2.0 and AI RMF. Start free today.
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
              onClick={() => navigate('/app')}
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
              Start free trial
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
            No credit card required. Free 14-day trial.
          </Typography>
        </Box>
      </Container>

      {/* Hero Image - Dashboard Preview */}
      <Container maxWidth="lg" sx={{ mt: 8 }}>
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
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#fca5a5',
                }}
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#fcd34d',
                }}
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#86efac',
                }}
              />
            </Box>
            <Box
              sx={{
                flex: 1,
                mx: 2,
                px: 3,
                py: 0.75,
                backgroundColor: '#ffffff',
                borderRadius: 1.5,
                fontSize: '0.8rem',
                color: '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              metricframe.ai/dashboard
            </Box>
          </Box>

          {/* Dashboard Preview */}
          <Box
            sx={{
              backgroundColor: '#f5f5f5',
              p: { xs: 2, md: 4 },
              minHeight: { xs: 300, md: 450 },
            }}
          >
            {/* Dashboard Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Box sx={{ width: 120, height: 12, backgroundColor: '#cbd5e1', borderRadius: 1, mb: 1 }} />
                <Box sx={{ width: 200, height: 8, backgroundColor: '#e2e8f0', borderRadius: 1 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ width: 80, height: 32, backgroundColor: '#e2e8f0', borderRadius: 1 }} />
                <Box sx={{ width: 80, height: 32, backgroundColor: '#0ea5e9', borderRadius: 1 }} />
              </Box>
            </Box>

            {/* Score Cards Grid */}
            <Grid container spacing={2}>
              {[
                { name: 'Govern', score: 87, color: '#22c55e' },
                { name: 'Identify', score: 92, color: '#22c55e' },
                { name: 'Protect', score: 68, color: '#f59e0b' },
                { name: 'Detect', score: 85, color: '#22c55e' },
                { name: 'Respond', score: 45, color: '#ef4444' },
                { name: 'Recover', score: 78, color: '#22c55e' },
              ].map((item) => (
                <Grid item xs={6} md={4} key={item.name}>
                  <Box
                    sx={{
                      backgroundColor: '#ffffff',
                      borderRadius: 2,
                      p: 2.5,
                      borderLeft: `4px solid ${item.color}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        fontWeight: 500,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: item.color,
                        lineHeight: 1,
                      }}
                    >
                      {item.score}%
                    </Typography>
                    <Box
                      sx={{
                        mt: 1.5,
                        height: 4,
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
      </Container>
    </Box>
  );
}
