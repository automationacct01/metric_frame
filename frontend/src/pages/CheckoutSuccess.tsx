/**
 * Checkout Success Page
 *
 * Displayed after a successful Stripe Checkout session.
 * Shows subscription confirmation and links to the app.
 */

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Dashboard as DashboardIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #e0e0e0',
          }}
        >
          {/* Success Icon */}
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: '#059669',
              mb: 3,
            }}
          />

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: '#1e293b',
            }}
          >
            Subscription Active
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 4,
              fontSize: '1.1rem',
              lineHeight: 1.6,
            }}
          >
            Your subscription has been activated successfully. You now have full
            access to MetricFrame and all its features.
          </Typography>

          {/* Session Reference */}
          {sessionId && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'text.disabled',
                mb: 4,
                fontFamily: 'monospace',
              }}
            >
              Session: {sessionId}
            </Typography>
          )}

          {/* Action Buttons */}
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/app')}
              sx={{
                py: 1.5,
                backgroundColor: '#0ea5e9',
                '&:hover': {
                  backgroundColor: '#0284c7',
                },
              }}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{
                py: 1.5,
                borderColor: '#cbd5e1',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: '#94a3b8',
                  backgroundColor: '#f8fafc',
                },
              }}
            >
              Back to Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
