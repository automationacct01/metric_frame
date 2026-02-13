/**
 * Landing Footer
 *
 * Footer with links, contact form, and legal.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Link,
  Divider,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#ffffff',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#0ea5e9' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#0ea5e9' },
};

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', subject: '', message: '' });
  const [hp, setHp] = useState('');
  const [mountTime] = useState(() => Date.now());
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _hp: hp, _t: mountTime }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong.');
      }
      setStatus('success');
      setForm({ name: '', email: '', company: '', subject: '', message: '' });
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  if (status === 'success') {
    return (
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
        <CheckCircleIcon sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
          Message Sent
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Thank you for reaching out. We'll get back to you shortly.
        </Typography>
        <Button
          onClick={() => setStatus('idle')}
          sx={{ mt: 2, color: '#0ea5e9', textTransform: 'none' }}
        >
          Send another message
        </Button>
      </Box>
    );
  }

  return (
    <Box
      id="contact-services"
      sx={{
        mt: 6,
        p: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        border: '1px solid rgba(14, 165, 233, 0.3)',
      }}
    >
      <Typography variant="h6" sx={{ color: '#ffffff', mb: 1, textAlign: 'center' }}>
        Need Help with Implementation?
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255, 255, 255, 0.7)',
          mb: 3,
          textAlign: 'center',
          maxWidth: 500,
          mx: 'auto',
        }}
      >
        Our team offers professional services including implementation support,
        customization, training, and enterprise integrations.
      </Typography>

      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}>
          {errorMsg}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ maxWidth: 600, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {/* Honeypot — hidden from users */}
        <input
          type="text"
          name="_hp"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Company (optional)"
              name="company"
              value={form.company}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              required
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Message"
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              multiline
              rows={4}
              sx={inputSx}
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          disabled={status === 'sending'}
          endIcon={status === 'sending' ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          sx={{
            alignSelf: 'center',
            mt: 1,
            px: 4,
            backgroundColor: '#0ea5e9',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': { backgroundColor: '#0284c7' },
          }}
        >
          {status === 'sending' ? 'Sending...' : 'Send Message'}
        </Button>
      </Box>
    </Box>
  );
}

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

        {/* Contact Form Section */}
        <ContactForm />

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
