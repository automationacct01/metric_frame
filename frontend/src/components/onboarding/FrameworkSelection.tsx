/**
 * Framework Selection Component
 *
 * Onboarding component that allows users to select their initial framework.
 * Displayed when a user first loads the application.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Container,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Fade,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useFramework, Framework } from '../../contexts/FrameworkContext';

interface FrameworkCardProps {
  framework: Framework;
  selected: boolean;
  onClick: () => void;
}

function FrameworkCard({ framework, selected, onClick }: FrameworkCardProps) {
  // Determine icon and color based on framework code
  const getFrameworkIcon = () => {
    switch (framework.code) {
      case 'csf_2_0':
        return <SecurityIcon sx={{ fontSize: 48, color: selected ? 'primary.main' : 'text.secondary' }} />;
      case 'ai_rmf':
        return <PsychologyIcon sx={{ fontSize: 48, color: selected ? 'secondary.main' : 'text.secondary' }} />;
      default:
        return <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    }
  };

  const getFrameworkColor = () => {
    switch (framework.code) {
      case 'csf_2_0':
        return 'primary';
      case 'ai_rmf':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getFrameworkHighlights = () => {
    switch (framework.code) {
      case 'csf_2_0':
        return [
          '6 Core Functions',
          '22 Categories',
          '106 Subcategories',
          'Cyber AI Profile Integration',
        ];
      case 'ai_rmf':
        return [
          '4 Core Functions',
          '19 Categories',
          '72 Subcategories',
          '7 Trustworthiness Characteristics',
        ];
      default:
        return [];
    }
  };

  return (
    <Card
      elevation={selected ? 8 : 2}
      sx={{
        height: '100%',
        position: 'relative',
        border: selected ? 2 : 1,
        borderColor: selected ? `${getFrameworkColor()}.main` : 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          elevation: 6,
          transform: 'translateY(-4px)',
        },
      }}
    >
      {selected && (
        <CheckCircleIcon
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: `${getFrameworkColor()}.main`,
            fontSize: 32,
          }}
        />
      )}
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getFrameworkIcon()}
            <Box sx={{ ml: 2 }}>
              <Typography variant="h5" component="h2" gutterBottom={false}>
                {framework.name}
              </Typography>
              <Chip
                label={`Version ${framework.version}`}
                size="small"
                color={getFrameworkColor() as 'primary' | 'secondary' | 'default'}
                variant="outlined"
              />
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
            {framework.description}
          </Typography>

          <Box sx={{ mt: 'auto' }}>
            <Typography variant="subtitle2" color="text.primary" gutterBottom>
              Framework Highlights:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {getFrameworkHighlights().map((highlight, index) => (
                <Chip
                  key={index}
                  label={highlight}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function FrameworkSelection() {
  const {
    frameworks,
    isLoadingFrameworks,
    frameworksError,
    selectFramework,
    setOnboardingCompleted,
  } = useFramework();

  const [selectedFrameworkLocal, setSelectedFrameworkLocal] = useState<Framework | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFrameworkSelect = (framework: Framework) => {
    setSelectedFrameworkLocal(framework);
  };

  const handleContinue = async () => {
    if (!selectedFrameworkLocal) return;

    setIsSubmitting(true);
    try {
      selectFramework(selectedFrameworkLocal);
      setOnboardingCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingFrameworks) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (frameworksError) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">
          Failed to load frameworks: {frameworksError}
        </Alert>
      </Container>
    );
  }

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
              Welcome to Cyber Metrics Flow
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Select a framework to get started with your cybersecurity metrics dashboard.
              You can change this later in settings.
            </Typography>
          </Box>

          {/* Framework Selection */}
          <Grid container spacing={4} sx={{ mb: 6 }}>
            {frameworks.map((framework) => (
              <Grid item xs={12} md={6} key={framework.id}>
                <FrameworkCard
                  framework={framework}
                  selected={selectedFrameworkLocal?.id === framework.id}
                  onClick={() => handleFrameworkSelect(framework)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Continue Button */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              disabled={!selectedFrameworkLocal || isSubmitting}
              onClick={handleContinue}
              endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
              sx={{
                py: 1.5,
                px: 6,
                fontSize: '1.1rem',
              }}
            >
              {isSubmitting ? 'Setting up...' : 'Continue to Dashboard'}
            </Button>
            {!selectedFrameworkLocal && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Please select a framework to continue
              </Typography>
            )}
          </Box>

          {/* Additional Info */}
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Both frameworks support comprehensive metrics tracking, AI-powered recommendations,
              and customizable dashboards. Choose the framework that best aligns with your
              organization's compliance requirements.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Fade>
  );
}

export default FrameworkSelection;
