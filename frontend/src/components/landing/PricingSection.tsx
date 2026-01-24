/**
 * Pricing Section
 *
 * Pricing tiers with feature comparison.
 */

import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import PricingCard from './PricingCard';

const pricingTiers = [
  {
    name: 'Basic',
    price: '$99',
    period: '/month',
    description: 'Essential metrics management for small AI and cybersecurity teams.',
    features: [
      'Up to 100 metrics',
      'Single framework (CSF or AI RMF)',
      'Executive dashboard',
      'CSV import/export',
      'Email support',
    ],
    highlighted: false,
    ctaText: 'Start Free Trial',
  },
  {
    name: 'Plus',
    price: '$249',
    period: '/month',
    description: 'Advanced features for growing AI and cybersecurity programs.',
    features: [
      'Up to 300 metrics',
      'Both frameworks included',
      'AI metric generation',
      'Custom catalog import',
      'Priority support',
      'API access',
      'Trend analysis',
    ],
    highlighted: true,
    ctaText: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: '$499',
    period: '/month',
    description: 'Full platform access for enterprise AI and cybersecurity teams.',
    features: [
      'Unlimited metrics',
      'Everything in Plus',
      'SSO/SAML authentication',
      'Custom integrations',
      'Dedicated success manager',
      'Advanced reporting & analytics',
      'On-premise deployment option',
    ],
    highlighted: false,
    ctaText: 'Start Free Trial',
  },
];

export default function PricingSection() {
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
                ctaText={tier.ctaText}
              />
            </Grid>
          ))}
        </Grid>

        {/* Additional Note */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            All plans include a 14-day free trial. No credit card required.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
