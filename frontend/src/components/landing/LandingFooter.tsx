/**
 * Landing Footer
 *
 * Footer with links, contact info, and legal.
 */

import React from 'react';
import { Box, Container, Typography, Grid, Link, Divider, IconButton } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Twitter as TwitterIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Changelog', href: '#' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/app/docs' },
      { label: 'API Reference', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Support', href: '#' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Partners', href: '#' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Compliance', href: '#' },
    ],
  },
};

export default function LandingFooter() {
  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
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

            {/* Social Links */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': { color: '#0ea5e9' },
                }}
              >
                <LinkedInIcon />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': { color: '#0ea5e9' },
                }}
              >
                <TwitterIcon />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': { color: '#0ea5e9' },
                }}
              >
                <GitHubIcon />
              </IconButton>
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
                        if (link.href.startsWith('#')) {
                          e.preventDefault();
                          scrollToSection(link.href);
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
