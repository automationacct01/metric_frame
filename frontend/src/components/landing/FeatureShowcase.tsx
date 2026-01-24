/**
 * Feature Showcase Section
 *
 * Clean alternating feature sections with generous whitespace.
 */

import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  SmartToy as AIIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';

const features = [
  {
    icon: <DashboardIcon sx={{ fontSize: 32 }} />,
    title: 'Executive Dashboard',
    description:
      'See your entire security posture at a glance. RAG-colored risk scores across all NIST CSF 2.0 functions give you instant visibility into what needs attention.',
    color: '#0ea5e9',
  },
  {
    icon: <AIIcon sx={{ fontSize: 32 }} />,
    title: 'AI-Powered Metrics',
    description:
      'Create metrics using natural language. Describe what you want to measure, and our AI generates the metric, formula, and framework mapping automatically.',
    color: '#8b5cf6',
  },
  {
    icon: <UploadIcon sx={{ fontSize: 32 }} />,
    title: 'Bring Your Own Catalog',
    description:
      'Import your existing metrics via CSV. Our AI automatically maps them to NIST subcategories while preserving your original categorization.',
    color: '#10b981',
  },
];

export default function FeatureShowcase() {
  return (
    <Box
      id="features"
      sx={{
        py: { xs: 10, md: 16 },
        backgroundColor: '#ffffff',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.75rem' },
              color: '#0f172a',
              mb: 2,
            }}
          >
            Everything you need to manage security metrics
          </Typography>
          <Typography
            sx={{
              color: '#64748b',
              fontSize: { xs: '1rem', md: '1.2rem' },
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            From executive reporting to AI-powered automation, MetricFrame has you covered.
          </Typography>
        </Box>

        {/* Feature Grid */}
        <Grid container spacing={6}>
          {features.map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <Box>
                {/* Icon */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    backgroundColor: `${feature.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: feature.color,
                    mb: 3,
                  }}
                >
                  {feature.icon}
                </Box>

                {/* Title */}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: '#0f172a',
                    mb: 2,
                    fontSize: '1.25rem',
                  }}
                >
                  {feature.title}
                </Typography>

                {/* Description */}
                <Typography
                  sx={{
                    color: '#64748b',
                    lineHeight: 1.7,
                    fontSize: '1rem',
                  }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
