/**
 * Use Cases Section
 *
 * Target personas and their use cases.
 */

import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, Avatar } from '@mui/material';
import {
  Shield as CISOIcon,
  Security as SecOpsIcon,
  Gavel as ComplianceIcon,
} from '@mui/icons-material';

const useCases = [
  {
    icon: <CISOIcon sx={{ fontSize: 32 }} />,
    title: 'CISOs & Security Leaders',
    description:
      'Present unified risk posture to the board with confidence. Executive dashboards translate technical metrics into business language.',
    benefits: [
      'Board-ready visualizations',
      'Risk trend analysis',
      'Framework alignment proof',
    ],
    color: '#0ea5e9',
  },
  {
    icon: <SecOpsIcon sx={{ fontSize: 32 }} />,
    title: 'Security Operations Teams',
    description:
      'Track 250+ metrics across all CSF functions with drill-down detail. Identify gaps and prioritize remediation efforts.',
    benefits: [
      'Real-time metric tracking',
      'Gap identification',
      'Prioritized action items',
    ],
    color: '#7c3aed',
  },
  {
    icon: <ComplianceIcon sx={{ fontSize: 32 }} />,
    title: 'Compliance Officers',
    description:
      'Demonstrate NIST alignment with auditable scoring methodology. Every calculation is transparent and defensible.',
    benefits: [
      'Audit-ready reports',
      'Transparent calculations',
      'Framework mapping evidence',
    ],
    color: '#059669',
  },
];

export default function UseCasesSection() {
  return (
    <Box
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
            WHO IT'S FOR
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
            Built for AI and Security Professionals
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
            Whether you're presenting to the board or tracking daily operations,
            MetricFrame adapts to your needs.
          </Typography>
        </Box>

        {/* Use Case Cards */}
        <Grid container spacing={4}>
          {useCases.map((useCase) => (
            <Grid item xs={12} md={4} key={useCase.title}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 10px 40px -10px ${useCase.color}33`,
                    borderColor: useCase.color,
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  {/* Icon */}
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: `${useCase.color}15`,
                      color: useCase.color,
                      mb: 3,
                    }}
                  >
                    {useCase.icon}
                  </Avatar>

                  {/* Title */}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                    }}
                  >
                    {useCase.title}
                  </Typography>

                  {/* Description */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                      mb: 3,
                    }}
                  >
                    {useCase.description}
                  </Typography>

                  {/* Benefits */}
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {useCase.benefits.map((benefit) => (
                      <Box
                        component="li"
                        key={benefit}
                        sx={{
                          color: 'text.secondary',
                          mb: 1,
                          '&::marker': {
                            color: useCase.color,
                          },
                        }}
                      >
                        <Typography variant="body2">{benefit}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
