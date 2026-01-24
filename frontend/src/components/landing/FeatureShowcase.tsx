/**
 * Feature Showcase Section
 *
 * Feature cards with screenshot placeholders for app functionality.
 */

import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import FeatureCard from './FeatureCard';

const features = [
  {
    title: 'Executive Dashboard',
    description:
      'See your entire AI and cybersecurity posture at a glance. Risk scores across all 6 NIST CSF 2.0 functions give you instant visibility into what needs attention.',
    badge: 'Core',
    badgeColor: '#0ea5e9',
    image: '', // Placeholder - will be /landing/screenshots/dashboard-hero.png
  },
  {
    title: 'Risk Scores',
    description:
      'Color-coded risk indicators (Red/Amber/Green) make it easy to identify problem areas and communicate status to leadership without technical jargon.',
    badge: 'Visual',
    badgeColor: '#059669',
    image: '', // Placeholder - will be /landing/screenshots/dashboard-rag.png
  },
  {
    title: 'Metrics Grid',
    description:
      'View, filter, and manage all 250+ metrics in one place. Sort by function, priority, or score to focus on what matters most.',
    badge: 'Data',
    badgeColor: '#7c3aed',
    image: '', // Placeholder - will be /landing/screenshots/metrics-grid.png
  },
  {
    title: 'AI-Powered Metrics',
    description:
      'Create metrics using natural language. Describe what you want to measure, and our AI generates the metric, formula, and framework mapping automatically.',
    badge: 'AI',
    badgeColor: '#dc2626',
    image: '', // Placeholder - will be /landing/screenshots/ai-chat.png
  },
  {
    title: 'Catalog Wizard',
    description:
      'Import your existing metrics via CSV with our guided wizard. AI automatically maps them to NIST subcategories while preserving your original categorization.',
    badge: 'Import',
    badgeColor: '#d97706',
    image: '', // Placeholder - will be /landing/screenshots/catalog-wizard.png
  },
  {
    title: 'Inline Editing',
    description:
      'Update metric values directly in the grid—whether entering baseline data manually or updating as automated feeds come online. Lock/unlock controls ensure data integrity while keeping updates quick and easy.',
    badge: 'Edit',
    badgeColor: '#0891b2',
    image: '', // Placeholder - will be /landing/gifs/inline-editing.gif
  },
];

export default function FeatureShowcase() {
  return (
    <Box
      id="features"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: '#ffffff',
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
            FEATURES
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
            Everything You Need to Manage AI and Security Metrics
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
            From executive reporting to AI-powered automation, MetricFrame has you covered.
          </Typography>
        </Box>

        {/* Feature Cards Grid */}
        <Grid container spacing={4}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title}>
              <FeatureCard
                title={feature.title}
                description={feature.description}
                image={feature.image || undefined}
                badge={feature.badge}
                badgeColor={feature.badgeColor}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
