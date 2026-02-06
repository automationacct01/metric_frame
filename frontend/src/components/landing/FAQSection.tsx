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
    question: 'Is MetricFrame really free?',
    answer:
      'Yes! MetricFrame is 100% free and open source. You can download it, run it on your own infrastructure, and use all features without any cost. The source code is available on GitHub.',
  },
  {
    question: 'Do I need my own API key?',
    answer:
      'Yes, MetricFrame requires you to bring your own AI API key. We support 6 providers: Anthropic, OpenAI, Together.ai, Azure OpenAI, AWS Bedrock, and GCP Vertex AI. This means your data stays private—we never see your metrics or API usage. Configure your preferred provider in Settings after installation.',
  },
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
    question: 'Is my data secure?',
    answer:
      'Absolutely. MetricFrame runs entirely on your own infrastructure—whether as a desktop app or Docker deployment. Your data never leaves your systems. All AI processing uses your own API keys, so even AI interactions are private between you and your chosen provider.',
  },
  {
    question: 'What frameworks are supported?',
    answer:
      'MetricFrame supports NIST CSF 2.0 and NIST AI RMF 1.0 frameworks out of the box. Our Bring Your Own Catalog feature allows you to import any metrics you want, regardless of their original framework. The AI will help map them to NIST subcategories while preserving your original categorization.',
  },
  {
    question: 'How does AI metric generation work?',
    answer:
      'Our AI assistant understands your natural language descriptions and generates complete metrics. You describe what you want to measure (e.g., "track our phishing training completion rate"), and the AI creates a metric with name, description, formula, target value, and appropriate NIST CSF mapping. You always have final approval before any metric is added.',
  },
  {
    question: 'Docker or Desktop—which should I choose?',
    answer:
      'Choose Desktop if you want a simple, one-click installation for personal use. Choose Docker if you need a server deployment, multi-user support, or want to use PostgreSQL for larger datasets. Both versions have identical features.',
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
