/**
 * FAQ Section
 *
 * Frequently asked questions with accordion.
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

const faqs = [
  {
    question: 'How does the scoring methodology work?',
    answer:
      'MetricFrame uses a transparent gap-to-target scoring methodology. Each metric has a target value, and your score is calculated based on how close your current value is to that target. For "higher is better" metrics like compliance rates, the formula is current/target. For "lower is better" metrics like incident response time, the formula is target/current. All calculations are visible and auditable.',
  },
  {
    question: 'Can I import my existing metrics?',
    answer:
      'Yes! MetricFrame supports CSV import through our Catalog Wizard. Simply upload your spreadsheet, map your columns to our fields, and our AI will automatically suggest NIST CSF 2.0 or AI RMF mappings for each metric. You can review and adjust these mappings before activating your catalog.',
  },
  {
    question: 'Does MetricFrame support custom frameworks?',
    answer:
      'Currently, MetricFrame supports NIST CSF 2.0 and NIST AI RMF 1.0 frameworks. However, our Bring Your Own Catalog feature allows you to import any metrics you want, regardless of their original framework. Our AI will help map them to NIST subcategories while preserving your original categorization.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. MetricFrame can be deployed entirely on-premise using Docker, meaning your data never leaves your infrastructure. For cloud deployments, we use industry-standard encryption at rest and in transit, and we never share your data with third parties. All AI processing uses your own API keys.',
  },
  {
    question: 'How does AI metric generation work?',
    answer:
      'Our AI assistant understands your natural language descriptions and generates complete metrics. You describe what you want to measure (e.g., "track our phishing training completion rate"), and the AI creates a metric with name, description, formula, target value, and appropriate NIST CSF mapping. You always have final approval before any metric is added.',
  },
  {
    question: 'Do I need automated data collection to get started?',
    answer:
      'No. MetricFrame is designed for teams at any stage of maturity. You can start by manually entering your current understanding of metric values—no data pipelines or integrations required. Many organizations begin with manual entry to establish baselines and prove value, then integrate automated data feeds as their metrics program matures. Start measuring today and build towards automation over time.',
  },
];

export default function FAQSection() {
  const [expanded, setExpanded] = useState<string | false>('panel0');

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box
      id="faq"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: '#ffffff',
      }}
    >
      <Container maxWidth="md">
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
            FAQ
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
            Frequently Asked Questions
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontSize: '1.1rem',
            }}
          >
            Got questions? We've got answers.
          </Typography>
        </Box>

        {/* FAQ Accordion */}
        <Box>
          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              expanded={expanded === `panel${index}`}
              onChange={handleChange(`panel${index}`)}
              elevation={0}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px !important',
                mb: 2,
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  margin: '0 0 16px 0',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  px: 3,
                  py: 1,
                  '& .MuiAccordionSummary-content': {
                    my: 2,
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.8,
                  }}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
