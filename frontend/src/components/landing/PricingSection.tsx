/**
 * Pricing Section
 *
 * Pricing tiers with feature comparison.
 */

import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import PricingCard from './PricingCard';
import { apiClient } from '../../api/client';

const pricingTiers = [
  {
    name: 'Standard',
    price: '$30',
    period: '/month',
    description: 'Full platform access with all AI and framework features.',
    features: [
      'Unlimited metrics',
      'Both frameworks (CSF 2.0 + AI RMF)',
      'Executive dashboard',
      'AI metric generation (BYO API key)',
      'AI-powered CSF mapping (BYO API key)',
      'CSV import/export',
      'Custom catalog import',
    ],
    highlighted: true,
    ctaText: 'Try Demo',
  },
  {
    name: 'Professional',
    price: '$200',
    period: '/month',
    description: 'Everything in Standard, with custom changes tailored to your organization.',
    features: [
      'Everything in Standard',
      'Custom integrations & API access',
      'Custom platform changes',
    ],
    highlighted: false,
    comingSoon: true,
    ctaText: 'Try Demo',
  },
];

export default function PricingSection() {
  const handleSubscribe = async (planName: string) => {
    try {
      const plan = planName.toLowerCase();
      const { checkout_url } = await apiClient.createCheckoutSession(plan);
      window.location.href = checkout_url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      // Fallback to demo if Stripe is not configured
      window.location.href = '/demo';
    }
  };

  return (
    <Box
      id="pricing"
      sx={{
        py: { xs: 8, md: 12 },
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="overline"
            sx={{
              color: '#0ea5e9',
              fontWeight: 600,
              letterSpacing: 2,
            }}
          >
            PRICING
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.5rem' },
              mt: 1,
              mb: 2,
            }}
          >
            Simple, Transparent Pricing
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontSize: '1.1rem',
            }}
          >
            Start free and scale as your AI and cybersecurity metrics program grows.
            No hidden fees, no surprises.
          </Typography>
        </Box>

        {/* Pricing Cards */}
        <Grid container spacing={4} justifyContent="center">
          {pricingTiers.map((tier) => (
            <Grid item xs={12} sm={6} md={4} key={tier.name}>
              <PricingCard
                name={tier.name}
                price={tier.price}
                period={tier.period}
                description={tier.description}
                features={tier.features}
                highlighted={tier.highlighted}
                comingSoon={tier.comingSoon}
                ctaText={tier.ctaText}
                onSubscribe={() => handleSubscribe(tier.name)}
              />
            </Grid>
          ))}
        </Grid>

        {/* Additional Note */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Try the demo to explore all features. No credit card required.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Need support for additional frameworks? Contact us to discuss custom framework expansion.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
