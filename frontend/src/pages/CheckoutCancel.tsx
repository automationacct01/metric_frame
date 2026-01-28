/**
 * Checkout Cancel Page
 *
 * Displayed when a user cancels the Stripe Checkout flow.
 * Provides links back to pricing and the home page.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)',
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
          {/* Cancel Icon */}
          <CancelIcon
            sx={{
              fontSize: 80,
              color: '#9ca3af',
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
            Checkout Canceled
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
            Your checkout was canceled. No charges have been made. You can return
            to the pricing page to try again whenever you are ready.
          </Typography>

          {/* Action Buttons */}
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                navigate('/');
                // Scroll to pricing section after navigation
                setTimeout(() => {
                  const el = document.getElementById('pricing');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              sx={{
                py: 1.5,
                backgroundColor: '#0ea5e9',
                '&:hover': {
                  backgroundColor: '#0284c7',
                },
              }}
            >
              View Pricing Plans
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
