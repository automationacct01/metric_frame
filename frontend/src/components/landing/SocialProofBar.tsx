/**
 * Social Proof Bar
 *
 * Clean stats bar with key metrics.
 */

import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';

const stats = [
  { value: '250+', label: 'Pre-configured Metrics' },
  { value: '10', label: 'Risk Functions Covered' },
  { value: '100%', label: 'Audit-Ready' },
];

export default function SocialProofBar() {
  return (
    <Box
      sx={{
        py: 6,
        backgroundColor: '#f8fafc',
      }}
    >
      <Container maxWidth="md">
        <Grid container spacing={4} justifyContent="center">
          {stats.map((stat) => (
            <Grid item xs={4} key={stat.label}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: { xs: '1.75rem', md: '2.5rem' },
                    lineHeight: 1,
                    mb: 1,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  sx={{
                    color: '#64748b',
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
