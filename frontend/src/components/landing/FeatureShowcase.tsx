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
      'See your entire AI and cybersecurity posture at a glance. Risk scores across NIST CSF 2.0 and AI RMF frameworks give you instant visibility into what needs attention.',
    badge: 'Visual',
    badgeColor: '#0ea5e9',
    image: './landing/gifs/dashboard.gif',
  },
  {
    title: 'Coverage Map',
    description:
      'Visualize your metric coverage across all NIST CSF categories. Quickly identify gaps in your measurement strategy and prioritize where to focus next.',
    badge: 'Coverage',
    badgeColor: '#059669',
    image: './landing/gifs/coverage-map.gif',
  },
  {
    title: 'Metrics Grid',
    description:
      'View, filter, and manage all 350+ metrics in one place. Sort by function, priority, or score to focus on what matters most.',
    badge: 'Data',
    badgeColor: '#7c3aed',
    image: './landing/gifs/metrics-grid.gif',
  },
  {
    title: 'AI-Powered Metrics',
    description:
      'Create metrics using natural language. Describe what you want to measure, and our AI generates the metric, formula, and framework mapping automatically.',
    badge: 'AI Chat',
    badgeColor: '#8b5cf6',
    image: './landing/gifs/ai-chat.gif',
  },
  {
    title: 'Catalog Wizard',
    description:
      'Import your existing metrics via CSV with our guided wizard. AI automatically maps them to NIST subcategories while preserving your original categorization.',
    badge: 'Import',
    badgeColor: '#ec4899',
    image: './landing/gifs/catalog-wizard.gif',
  },
  {
    title: 'Drill-Down Analytics',
    description:
      'Click any function to drill down into category-level scores, trend charts, and detailed breakdowns. Instantly see which areas need attention with color-coded risk badges.',
    badge: 'Insights',
    badgeColor: '#0891b2',
    image: './landing/gifs/inline-editing.gif',
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
            Everything You Need to Manage AI and Cybersecurity Metrics
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
                badge={feature.badge}
                badgeColor={feature.badgeColor}
                image={feature.image}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
