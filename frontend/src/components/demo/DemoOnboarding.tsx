/**
 * Demo Onboarding Component
 *
 * Handles the demo onboarding flow:
 * 1. Email capture (required)
 * 2. Intro video (skippable)
 * 3. Enter Demo button
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Link,
} from '@mui/material';
import {
  Email as EmailIcon,
  PlayArrow as PlayIcon,
  SkipNext as SkipIcon,
  Dashboard as DashboardIcon,
  Timer as TimerIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useDemo } from '../../contexts/DemoContext';
import { apiClient } from '../../api/client';

// Demo onboarding steps
const STEPS = ['Email', 'Video', 'Start Demo'];

// Demo features to highlight
const DEMO_FEATURES = [
  {
    icon: <DashboardIcon />,
    title: 'Full Dashboard Access',
    description: 'View all risk scores and metrics across NIST CSF 2.0 and AI RMF frameworks',
  },
  {
    icon: <SecurityIcon />,
    title: 'Sample Metrics',
    description: 'Explore representative metrics from each framework category',
  },
  {
    icon: <TimerIcon />,
    title: '24-Hour Access',
    description: 'Full demo access for 24 hours, no credit card required',
  },
];

export default function DemoOnboarding() {
  const navigate = useNavigate();
  const { createSession, startDemo, isLoading, error: contextError } = useDemo();

  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [videoWatched, setVideoWatched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionCreated, setSessionCreated] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Validate email
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createSession(email);
      setSessionCreated(true);
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to create demo session');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle video skip
  const handleSkipVideo = () => {
    setVideoWatched(true);
    setActiveStep(2);
  };

  // Handle video end
  const handleVideoEnd = () => {
    setVideoWatched(true);
    setActiveStep(2);
  };

  // Handle start demo
  const handleStartDemo = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await startDemo(!videoWatched);

      // Set the demo session header for all future API calls
      const sessionId = localStorage.getItem('metricframe_demo_session_id');
      if (sessionId) {
        apiClient.setDemoSession(sessionId);
      }

      // Navigate to dashboard
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to start demo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render email step
  const renderEmailStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Start Your Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Enter your email to begin exploring the cybersecurity metrics dashboard
      </Typography>

      <Box sx={{ maxWidth: 400, mx: 'auto' }}>
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
          error={!!emailError}
          helperText={emailError}
          disabled={isSubmitting}
          InputProps={{
            startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
          }}
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleEmailSubmit}
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Continue'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          By continuing, you agree to receive product updates. You can unsubscribe anytime.
        </Typography>
      </Box>
    </Box>
  );

  // Render video step
  const renderVideoStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Quick Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Watch a brief introduction to the platform, or skip to start exploring
      </Typography>

      <Box
        sx={{
          maxWidth: 640,
          mx: 'auto',
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'grey.900',
          position: 'relative',
          aspectRatio: '16/9',
        }}
      >
        {/* Placeholder for video - replace with actual video URL */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'grey.500',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <PlayIcon sx={{ fontSize: 64, mb: 2 }} />
            <Typography>Video placeholder</Typography>
            <Typography variant="caption" color="text.secondary">
              Coming soon
            </Typography>
          </Box>
        </Box>
        {/* Uncomment when video is ready:
        <video
          ref={videoRef}
          controls
          onEnded={handleVideoEnd}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src="/demo-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        */}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<SkipIcon />}
          onClick={handleSkipVideo}
        >
          Skip Video
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleSkipVideo}
        >
          Continue to Demo
        </Button>
      </Box>
    </Box>
  );

  // Render start demo step
  const renderStartStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Ready to Explore
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Your 24-hour demo access is ready. Here's what you can do:
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          maxWidth: 900,
          mx: 'auto',
          mb: 4,
        }}
      >
        {DEMO_FEATURES.map((feature, index) => (
          <Card key={index} variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ color: 'primary.main', mb: 1 }}>{feature.icon}</Box>
              <Typography variant="subtitle1" gutterBottom>
                {feature.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {feature.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
        <Typography variant="body2">
          <strong>Demo Limitations:</strong> You can view all dashboard features but cannot edit
          existing metrics. You can create up to 2 AI-generated metrics per framework.
        </Typography>
      </Alert>

      <Button
        variant="contained"
        size="large"
        startIcon={<DashboardIcon />}
        onClick={handleStartDemo}
        disabled={isSubmitting}
        sx={{ minWidth: 200 }}
      >
        {isSubmitting ? <CircularProgress size={24} /> : 'Enter Demo'}
      </Button>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            MetricFrame Demo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Experience the cybersecurity metrics dashboard
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Divider sx={{ mb: 4 }} />

        {/* Error display */}
        {(error || contextError) && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error || contextError}
          </Alert>
        )}

        {/* Step content */}
        {activeStep === 0 && renderEmailStep()}
        {activeStep === 1 && renderVideoStep()}
        {activeStep === 2 && renderStartStep()}

        {/* Footer */}
        <Divider sx={{ mt: 4, mb: 2 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link href="/login" underline="hover">
              Sign in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
