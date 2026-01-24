/**
 * Problem Section
 *
 * Highlights the pain points that security teams face.
 */

import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent } from '@mui/material';
import {
  TableChart as SpreadsheetIcon,
  Rule as ComplianceIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';

const problems = [
  {
    icon: <SpreadsheetIcon sx={{ fontSize: 48 }} />,
    title: 'Spreadsheet Chaos',
    description:
      'AI and cybersecurity metrics scattered across spreadsheets, tools, and systems. No single source of truth for your AI and cybersecurity posture.',
  },
  {
    icon: <ComplianceIcon sx={{ fontSize: 48 }} />,
    title: 'Framework Confusion',
    description:
      'Difficulty mapping your metrics to NIST CSF 2.0 or AI RMF. Manual alignment is time-consuming and error-prone.',
  },
  {
    icon: <TranslateIcon sx={{ fontSize: 48 }} />,
    title: 'Executive Translation',
    description:
      'Struggling to communicate technical AI and cybersecurity metrics to the board in a language they understand.',
  },
];

export default function ProblemSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="overline"
            sx={{
              color: '#ef4444',
              fontWeight: 600,
              letterSpacing: 2,
            }}
          >
            THE CHALLENGE
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
            Your AI and Security Metrics Are Scattered.
            <br />
            Your Leadership Wants Answers.
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
            Sound familiar? You're not alone. AI and cybersecurity teams everywhere face these challenges.
          </Typography>
        </Box>

        {/* Problem Cards */}
        <Grid container spacing={4}>
          {problems.map((problem) => (
            <Grid item xs={12} md={4} key={problem.title}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#ef4444',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 40px -10px rgba(239, 68, 68, 0.2)',
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Box
                    sx={{
                      color: '#ef4444',
                      mb: 2,
                      opacity: 0.8,
                    }}
                  >
                    {problem.icon}
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                    }}
                  >
                    {problem.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                    }}
                  >
                    {problem.description}
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
