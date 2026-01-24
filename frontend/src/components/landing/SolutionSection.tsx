/**
 * Solution Section
 *
 * How MetricFrame solves the problems.
 */

import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  SmartToy as AIIcon,
  Visibility as TransparencyIcon,
} from '@mui/icons-material';

const solutions = [
  {
    icon: <DashboardIcon sx={{ fontSize: 40 }} />,
    title: 'Unified Dashboard',
    description:
      'All 6 NIST CSF functions in one view. See your entire risk posture at a glance.',
    color: '#0ea5e9',
  },
  {
    icon: <AIIcon sx={{ fontSize: 40 }} />,
    title: 'AI-Powered Intelligence',
    description:
      'Create metrics with natural language. Let AI handle CSF mapping and suggest improvements.',
    color: '#7c3aed',
  },
  {
    icon: <TransparencyIcon sx={{ fontSize: 40 }} />,
    title: 'Transparent Scoring',
    description:
      'Auditable gap-to-target methodology. Every score is explainable and defensible.',
    color: '#059669',
  },
];

export default function SolutionSection() {
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
            THE SOLUTION
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
            One Dashboard. Complete Risk Visibility.
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
            MetricFrame unifies your AI and cybersecurity metrics into a single,
            framework-aligned view that executives understand.
          </Typography>
        </Box>

        {/* Solution Cards */}
        <Grid container spacing={4}>
          {solutions.map((solution) => (
            <Grid item xs={12} md={4} key={solution.title}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 10px 40px -10px ${solution.color}33`,
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 2,
                      backgroundColor: `${solution.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                      color: solution.color,
                    }}
                  >
                    {solution.icon}
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                    }}
                  >
                    {solution.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                    }}
                  >
                    {solution.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
