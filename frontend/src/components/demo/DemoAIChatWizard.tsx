/**
 * Demo AI Chat Wizard
 *
 * Security-hardened guided AI chat experience for demo users.
 * Replaces free-form chat with pre-defined starters to prevent abuse.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Timer as TimerIcon,
  Balance as BalanceIcon,
  Visibility as VisibilityIcon,
  AutoAwesome as AIIcon,
  Check as CheckIcon,
  Lock as LockIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useDemo } from '../../contexts/DemoContext';
import { useFramework } from '../../contexts/FrameworkContext';
import {
  DemoStarterOption,
  DemoRefinementOption,
  DemoAIChatStatus,
  DemoGuidedChatResponse,
} from '../../types';

// Step labels
const STEPS = ['Choose a Starter', 'AI Generates Metric', 'Review & Create'];

// Icon mapping
const ICON_MAP: Record<string, React.ReactNode> = {
  security: <SecurityIcon />,
  timer: <TimerIcon />,
  balance: <BalanceIcon />,
  visibility: <VisibilityIcon />,
};

interface WizardState {
  step: number;
  selectedStarter: DemoStarterOption | null;
  selectedRefinement: DemoRefinementOption | null;
  generatedMetric: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  chatStatus: DemoAIChatStatus | null;
}

export default function DemoAIChatWizard() {
  const navigate = useNavigate();
  const { sessionId, incrementQuota } = useDemo();
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  const [state, setState] = useState<WizardState>({
    step: 0,
    selectedStarter: null,
    selectedRefinement: null,
    generatedMetric: null,
    loading: false,
    error: null,
    chatStatus: null,
  });

  // Load chat status on mount and when framework changes
  useEffect(() => {
    if (sessionId) {
      loadChatStatus();
    }
  }, [sessionId, frameworkCode]);

  const loadChatStatus = async () => {
    if (!sessionId) return;

    try {
      const status = await apiClient.getDemoAIChatStatus(sessionId, frameworkCode);
      setState(prev => ({ ...prev, chatStatus: status }));
    } catch (err) {
      console.error('Failed to load chat status:', err);
    }
  };

  const handleSelectStarter = async (starter: DemoStarterOption) => {
    if (!sessionId) return;

    setState(prev => ({
      ...prev,
      selectedStarter: starter,
      loading: true,
      error: null,
      step: 1,
    }));

    try {
      const response = await apiClient.demoGuidedChat(sessionId, {
        starter_id: starter.id,
        framework: frameworkCode,
      });

      if (response.success && response.metric) {
        setState(prev => ({
          ...prev,
          generatedMetric: response.metric || null,
          loading: false,
          step: 2,
          chatStatus: prev.chatStatus ? {
            ...prev.chatStatus,
            interactions_used: response.interactions_used,
            interactions_remaining: response.interactions_remaining,
            chat_locked: response.chat_locked,
          } : null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to generate metric',
          step: 0,
        }));
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.detail || 'Failed to generate metric',
        step: 0,
      }));
    }
  };

  const handleApplyRefinement = async (refinement: DemoRefinementOption) => {
    if (!sessionId || !state.selectedStarter) return;

    setState(prev => ({
      ...prev,
      selectedRefinement: refinement,
      loading: true,
      error: null,
    }));

    try {
      const response = await apiClient.demoGuidedChat(sessionId, {
        starter_id: state.selectedStarter.id,
        framework: frameworkCode,
        refinement_id: refinement.id,
      });

      if (response.success && response.metric) {
        setState(prev => ({
          ...prev,
          generatedMetric: response.metric || null,
          loading: false,
          chatStatus: prev.chatStatus ? {
            ...prev.chatStatus,
            interactions_used: response.interactions_used,
            interactions_remaining: response.interactions_remaining,
            chat_locked: response.chat_locked,
          } : null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to apply refinement',
        }));
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.detail || 'Failed to apply refinement',
      }));
    }
  };

  const handleCreateMetric = async () => {
    if (!sessionId || !state.selectedStarter) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await apiClient.demoGuidedChatCreateMetric(sessionId, {
        starter_id: state.selectedStarter.id,
        framework: frameworkCode,
        refinement_id: state.selectedRefinement?.id,
      });

      // Increment local quota
      incrementQuota(frameworkCode as 'csf_2_0' | 'ai_rmf');

      // Show success and reset
      setState(prev => ({
        ...prev,
        loading: false,
        step: 0,
        selectedStarter: null,
        selectedRefinement: null,
        generatedMetric: null,
      }));

      // Reload chat status
      loadChatStatus();

      // Could navigate to metrics grid or show success message
      alert('Metric created successfully!');
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.detail || 'Failed to create metric',
      }));
    }
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      step: 0,
      selectedStarter: null,
      selectedRefinement: null,
      generatedMetric: null,
      error: null,
    }));
  };

  // If chat is locked or no interactions remaining, show upgrade CTA
  if (state.chatStatus && (state.chatStatus.chat_locked || !state.chatStatus.can_use_chat)) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <LockIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          AI Chat Demo Complete
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {state.chatStatus.lock_reason || "You've explored the AI chat feature in demo mode."}
        </Typography>

        <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            In the full version, you can:
          </Typography>
          <Box component="ul" sx={{ textAlign: 'left', pl: 2 }}>
            <li>Create unlimited metrics with natural language</li>
            <li>Ask questions about your security posture</li>
            <li>Generate executive reports</li>
            <li>Get AI-powered recommendations</li>
          </Box>
        </Paper>

        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<UpgradeIcon />}
          onClick={() => navigate('/app')}
          sx={{ px: 4 }}
        >
          Get Full Access
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          You can still explore the Dashboard and Metrics you've created during this demo.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Progress Indicator */}
      {state.chatStatus && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              AI Chat Interactions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {state.chatStatus.interactions_used} / {state.chatStatus.interactions_used + state.chatStatus.interactions_remaining}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(state.chatStatus.interactions_used / (state.chatStatus.interactions_used + state.chatStatus.interactions_remaining)) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}

      {/* Stepper */}
      <Stepper activeStep={state.step} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Step 0: Choose Starter */}
      {state.step === 0 && !state.loading && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Create a Metric with AI
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Choose what type of metric you'd like to create:
          </Typography>

          <Grid container spacing={2}>
            {state.chatStatus?.starters.map((starter) => (
              <Grid item xs={12} md={6} key={starter.id}>
                <Card>
                  <CardActionArea onClick={() => handleSelectStarter(starter)}>
                    <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText',
                        }}
                      >
                        {ICON_MAP[starter.icon || 'security'] || <SecurityIcon />}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {starter.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {starter.description}
                        </Typography>
                        <Chip
                          label={starter.category}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Upgrade Teaser */}
          <Paper
            sx={{
              mt: 4,
              p: 2,
              backgroundColor: 'grey.50',
              border: '1px dashed',
              borderColor: 'grey.300',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon color="primary" />
              <Typography variant="body2" color="text.secondary">
                <strong>Full AI Chat unlocks with paid subscription</strong> - Create any metric with natural language
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Step 1: Loading / Generating */}
      {state.step === 1 && state.loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6">
            AI is generating your metric...
          </Typography>
          <Typography color="text.secondary">
            This may take a few seconds
          </Typography>
        </Box>
      )}

      {/* Step 2: Review Metric */}
      {state.step === 2 && state.generatedMetric && (
        <Box>
          <Typography variant="h5" gutterBottom>
            AI Generated Metric
          </Typography>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {state.generatedMetric.name as string}
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography>
                  {state.generatedMetric.description as string || 'No description'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Formula
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', backgroundColor: 'grey.100', p: 1, borderRadius: 1 }}>
                  {state.generatedMetric.formula as string || 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Target
                </Typography>
                <Typography fontWeight="bold">
                  {state.generatedMetric.target_value as number || 'N/A'}
                  {state.generatedMetric.target_units as string || '%'}
                </Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Direction
                </Typography>
                <Typography fontWeight="bold">
                  {(state.generatedMetric.direction as string || '').replace(/_/g, ' ')}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Category: ${state.selectedStarter?.category || 'N/A'}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`Priority: ${state.generatedMetric.priority_rank === 1 ? 'High' : state.generatedMetric.priority_rank === 2 ? 'Medium' : 'Low'}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Refinement Options */}
          {state.chatStatus?.refinements && state.chatStatus.refinements.length > 0 && !state.selectedRefinement && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Want to refine this metric?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {state.chatStatus.refinements.map((refinement) => (
                  <Button
                    key={refinement.id}
                    variant="outlined"
                    size="small"
                    onClick={() => handleApplyRefinement(refinement)}
                    disabled={state.loading}
                  >
                    {refinement.label}
                  </Button>
                ))}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setState(prev => ({ ...prev, selectedRefinement: { id: 'skip', label: 'Skip', description: '' } }))}
                >
                  Skip
                </Button>
              </Box>
            </Box>
          )}

          {/* Loading refinement */}
          {state.loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CircularProgress size={24} />
              <Typography>Applying refinement...</Typography>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<CheckIcon />}
              onClick={handleCreateMetric}
              disabled={state.loading}
            >
              Create Metric
            </Button>
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={state.loading}
            >
              Start Over
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
