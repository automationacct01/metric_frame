/**
 * Why Now Section
 *
 * Emphasizes that organizations can start immediately with manual entry
 * and build towards automation over time.
 */

import React from 'react';
import { Box, Container, Typography, Grid, Paper } from '@mui/material';
import {
  Edit as ManualIcon,
  Analytics as BaselineIcon,
  AutoMode as AutomateIcon,
} from '@mui/icons-material';

const maturitySteps = [
  {
    phase: 'Day One',
    icon: <ManualIcon sx={{ fontSize: 36 }} />,
    title: 'Start with Manual Entry',
    description:
      'Your team inputs their current understanding of each metric. No data pipelines or integrations required.',
    color: '#0ea5e9',
  },
  {
    phase: 'Month Three',
    icon: <BaselineIcon sx={{ fontSize: 36 }} />,
    title: 'Establish Baselines',
    description:
      'Identify gaps, track trends, and prioritize which metrics to automate first based on real data.',
    color: '#7c3aed',
  },
  {
    phase: 'Over Time',
    icon: <AutomateIcon sx={{ fontSize: 36 }} />,
    title: 'Build Automation',
    description:
      'Integrate data sources and automate collection as your metrics program matures.',
    color: '#059669',
  },
];

export default function WhyNowSection() {
  return (
    <Box
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
            START TODAY, PERFECT LATER
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
            Don't Wait for Perfect Data to Start Measuring
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 700,
              mx: 'auto',
              fontSize: '1.1rem',
              lineHeight: 1.7,
            }}
          >
            Many organizations delay metrics reporting while waiting for full data automation.
            MetricFrame lets you start now with manual input and mature at your own pace.
            Your team's current understanding is a valid starting point.
          </Typography>
        </Box>

        {/* Maturity Path */}
        <Box sx={{ position: 'relative' }}>
          <Grid container spacing={4} alignItems="stretch">
            {maturitySteps.map((step) => (
              <Grid item xs={12} md={4} key={step.phase} sx={{ display: 'flex' }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    flex: 1,
                    height: '100%',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 10px 40px -10px ${step.color}33`,
                      borderColor: step.color,
                    },
                  }}
                >
                  {/* Phase Label */}
                  <Typography
                    variant="overline"
                    sx={{
                      color: step.color,
                      fontWeight: 700,
                      letterSpacing: 1,
                    }}
                  >
                    {step.phase}
                  </Typography>

                  {/* Icon */}
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      backgroundColor: `${step.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      my: 2,
                      color: step.color,
                    }}
                  >
                    {step.icon}
                  </Box>

                  {/* Title */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1.5,
                    }}
                  >
                    {step.title}
                  </Typography>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                    }}
                  >
                    {step.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Bottom Quote */}
        <Box
          sx={{
            mt: 6,
            textAlign: 'center',
            p: 4,
            backgroundColor: '#f8fafc',
            borderRadius: 3,
            border: '1px solid #e5e7eb',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontStyle: 'italic',
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontSize: '1.05rem',
            }}
          >
            "Work backwards from reporting to data collection. Establish what you need to measure first,
            then build the pipelines to automate it over time."
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
