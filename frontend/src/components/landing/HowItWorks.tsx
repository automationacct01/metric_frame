/**
 * How It Works Section
 *
 * 4-step process visualization.
 */

import React from 'react';
import { Box, Container, Typography, Grid, Paper } from '@mui/material';
import {
  CloudUpload as UploadIcon,
  AccountTree as MapIcon,
  TrackChanges as TargetIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';

const steps = [
  {
    number: '01',
    icon: <UploadIcon sx={{ fontSize: 40 }} />,
    title: 'Choose Your Metrics',
    description:
      'Start with our standard metrics catalog or import your own via CSV.',
  },
  {
    number: '02',
    icon: <MapIcon sx={{ fontSize: 40 }} />,
    title: 'Map to Frameworks',
    description:
      'Automatically align metrics to NIST CSF 2.0 or AI RMF 1.0 subcategories with AI assistance.',
  },
  {
    number: '03',
    icon: <TargetIcon sx={{ fontSize: 40 }} />,
    title: 'Set Targets',
    description:
      'Define target values and the system calculates your gap-to-target scores automatically.',
  },
  {
    number: '04',
    icon: <ReportIcon sx={{ fontSize: 40 }} />,
    title: 'Report to Leadership',
    description:
      'Generate executive-ready dashboards with RAG risk ratings your board will understand.',
  },
];

export default function HowItWorks() {
  return (
    <Box
      id="how-it-works"
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
            HOW IT WORKS
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
            Get Started in Minutes, Not Months
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
            Four simple steps to transform your AI and security metrics management.
          </Typography>
        </Box>

        {/* Steps */}
        <Grid container spacing={4}>
          {steps.map((step, index) => (
            <Grid item xs={12} sm={6} md={3} key={step.number}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  textAlign: 'center',
                  border: '1px solid #e5e7eb',
                  borderRadius: 3,
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 40px -15px rgba(14, 165, 233, 0.3)',
                    borderColor: '#0ea5e9',
                  },
                }}
              >
                {/* Step Number */}
                <Typography
                  variant="h6"
                  sx={{
                    color: '#0ea5e9',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    letterSpacing: 2,
                    mb: 2,
                  }}
                >
                  STEP {step.number}
                </Typography>

                {/* Icon */}
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: '#0ea5e915',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    color: '#0ea5e9',
                  }}
                >
                  {step.icon}
                </Box>

                {/* Title */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
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

                {/* Connector Line (not on last item) */}
                {index < steps.length - 1 && (
                  <Box
                    sx={{
                      display: { xs: 'none', md: 'block' },
                      position: 'absolute',
                      top: '50%',
                      right: -32,
                      width: 64,
                      height: 2,
                      backgroundColor: '#e5e7eb',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        right: 0,
                        top: -4,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: '8px solid #e5e7eb',
                      },
                    }}
                  />
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
