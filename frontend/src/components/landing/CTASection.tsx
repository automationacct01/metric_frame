/**
 * CTA Section
 *
 * Clean final call-to-action.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button } from '@mui/material';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        py: { xs: 10, md: 16 },
        backgroundColor: '#0f172a',
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center' }}>
          {/* Headline */}
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.75rem' },
              color: '#ffffff',
              mb: 3,
            }}
          >
            Ready to simplify your AI and cybersecurity metrics?
          </Typography>

          {/* Subheadline */}
          <Typography
            sx={{
              color: '#94a3b8',
              fontSize: { xs: '1rem', md: '1.2rem' },
              mb: 5,
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Join AI and cybersecurity teams using MetricFrame to track, measure, and report with confidence.
          </Typography>

          {/* CTA */}
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
            Try Demo
          </Button>

          {/* Trust Note */}
          <Typography
            sx={{
              color: '#64748b',
              fontSize: '0.875rem',
              mt: 3,
            }}
          >
            No credit card required
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
