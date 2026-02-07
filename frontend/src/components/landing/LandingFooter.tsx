/**
 * Landing Footer
 *
 * Footer with links, contact info, and legal.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Grid, Link, Divider } from '@mui/material';

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Download', href: '/download' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/wiki' },
      { label: 'API Reference', href: '/wiki/api-reference' },
      { label: 'Security', href: '/wiki/security' },
      { label: 'Scoring Methodology', href: '/wiki/scoring-methodology' },
    ],
  },
  services: {
    title: 'Services',
    links: [
      { label: 'Implementation Support', href: '#contact-services' },
      { label: 'Customization', href: '#contact-services' },
      { label: 'Enterprise Support', href: '#contact-services' },
      { label: 'Contact Us', href: '#contact-services' },
    ],
  },
};

export default function LandingFooter() {
  const navigate = useNavigate();

  const handleLinkClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (href.startsWith('/')) {
      navigate(href);
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        pt: 8,
        pb: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand Column */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <Box
              component="img"
              src="/logo-metricframe.svg"
              alt="MetricFrame"
              sx={{
                height: 40,
                mb: 2,
                filter: 'brightness(0) invert(1)',
              }}
            />
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: 1.8,
                  maxWidth: 300,
                }}
              >
                Unified AI and cybersecurity risk visibility across frameworks.
                Transform your AI and cybersecurity metrics into executive-ready insights.
              </Typography>
            </Box>
          </Grid>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <Grid item xs={6} sm={3} md={2} key={section.title}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#ffffff',
                  mb: 2,
                }}
              >
                {section.title}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {section.links.map((link) => (
                  <Box component="li" key={link.label} sx={{ mb: 1.5 }}>
                    <Link
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith('#') || link.href.startsWith('/')) {
                          e.preventDefault();
                          handleLinkClick(link.href);
                        }
                      }}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        transition: 'color 0.2s ease',
                        '&:hover': {
                          color: '#0ea5e9',
                        },
                      }}
                    >
                      {link.label}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Professional Services Section */}
        <Box
          id="contact-services"
          sx={{
            mt: 6,
            p: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
            Need Help with Implementation?
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 2,
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Our team offers professional services including implementation support,
            customization, training, and enterprise integrations.
          </Typography>
          <Link
            href="mailto:services@metricframe.ai"
            sx={{
              display: 'inline-block',
              px: 3,
              py: 1,
              borderRadius: 1,
              backgroundColor: '#0ea5e9',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'background-color 0.2s ease',
              '&:hover': {
                backgroundColor: '#0284c7',
              },
            }}
          >
            Contact Us for Services
          </Link>
        </Box>

        <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Bottom Row */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            {new Date().getFullYear()} MetricFrame. All rights reserved.
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            Powered by NIST CSF 2.0 & NIST AI RMF 1.0
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
