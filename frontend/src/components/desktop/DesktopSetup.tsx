/**
 * Desktop Setup Wizard
 *
 * First-launch setup for the desktop app. Allows users to choose between:
 * 1. Password protection with security questions for recovery
 * 2. No authentication (direct access)
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useDesktopAuth, AuthMode } from '../../contexts/DesktopAuthContext';

// Predefined security questions
const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What was your favorite food as a child?",
  "What is the name of your favorite childhood friend?",
  "What was the make of your first car?",
];

export default function DesktopSetup() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { completeSetup, isLoading, error, clearError } = useDesktopAuth();

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<AuthMode | null>(null);

  // Password form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [question1, setQuestion1] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer2, setAnswer2] = useState('');

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null);

  const steps = selectedMode === 'password'
    ? ['Choose Mode', 'Set Password', 'Security Questions', 'Complete']
    : ['Choose Mode', 'Complete'];

  const handleModeSelect = (mode: AuthMode) => {
    setSelectedMode(mode);
    clearError();
    setValidationError(null);
    setActiveStep(1);
  };

  const handlePasswordNext = () => {
    setValidationError(null);

    if (password.length < 4) {
      setValidationError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    setActiveStep(2);
  };

  const handleSecurityNext = () => {
    setValidationError(null);

    if (!question1 || !answer1.trim()) {
      setValidationError('Please complete security question 1');
      return;
    }
    if (!question2 || !answer2.trim()) {
      setValidationError('Please complete security question 2');
      return;
    }
    if (question1 === question2) {
      setValidationError('Please select different security questions');
      return;
    }
    setActiveStep(3);
  };

  const handleComplete = async () => {
    setValidationError(null);

    try {
      if (selectedMode === 'password') {
        await completeSetup('password', {
          password,
          security_question_1: question1,
          security_answer_1: answer1,
          security_question_2: question2,
          security_answer_2: answer2,
        });
      } else {
        await completeSetup('none');
      }
      // On success, the context will update and App.tsx will redirect
    } catch {
      // Error is handled by context
    }
  };

  const handleBack = () => {
    if (activeStep === 1 && selectedMode !== 'password') {
      setSelectedMode(null);
      setActiveStep(0);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  // Step 0: Choose authentication mode
  const renderModeSelection = () => (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Welcome to MetricFrame
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        How would you like to secure your desktop app?
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
        <Card
          sx={{
            width: { xs: '100%', sm: 280 },
            cursor: 'pointer',
            border: 2,
            borderColor: 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              transform: 'translateY(-4px)',
              boxShadow: 4,
            },
          }}
          onClick={() => handleModeSelect('password')}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Password Protection
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set a password to protect your data. Includes security questions for recovery.
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            width: { xs: '100%', sm: 280 },
            cursor: 'pointer',
            border: 2,
            borderColor: 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              transform: 'translateY(-4px)',
              boxShadow: 4,
            },
          }}
          onClick={() => handleModeSelect('none')}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <LockOpenIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quick access without a password. Best for personal devices.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );

  // Step 1 (password mode): Set password
  const renderPasswordForm = () => (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom fontWeight={600} textAlign="center">
        Create Your Password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} textAlign="center">
        Choose a password you'll remember. Minimum 4 characters.
      </Typography>

      <Stack spacing={3}>
        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordNext}
            disabled={isLoading || !password || !confirmPassword}
          >
            Next
          </Button>
        </Box>
      </Stack>
    </Box>
  );

  // Step 2 (password mode): Security questions
  const renderSecurityQuestions = () => (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
        <SecurityIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>
          Security Questions
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} textAlign="center">
        These will be used to recover your password if you forget it.
      </Typography>

      <Stack spacing={3}>
        <FormControl fullWidth>
          <InputLabel>Security Question 1</InputLabel>
          <Select
            value={question1}
            label="Security Question 1"
            onChange={(e) => setQuestion1(e.target.value)}
          >
            {SECURITY_QUESTIONS.map((q) => (
              <MenuItem key={q} value={q} disabled={q === question2}>
                {q}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Answer 1"
          value={answer1}
          onChange={(e) => setAnswer1(e.target.value)}
          helperText="Answers are not case-sensitive"
        />

        <FormControl fullWidth>
          <InputLabel>Security Question 2</InputLabel>
          <Select
            value={question2}
            label="Security Question 2"
            onChange={(e) => setQuestion2(e.target.value)}
          >
            {SECURITY_QUESTIONS.map((q) => (
              <MenuItem key={q} value={q} disabled={q === question1}>
                {q}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Answer 2"
          value={answer2}
          onChange={(e) => setAnswer2(e.target.value)}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleSecurityNext}
            disabled={isLoading || !question1 || !answer1 || !question2 || !answer2}
          >
            Next
          </Button>
        </Box>
      </Stack>
    </Box>
  );

  // Final step: Confirmation
  const renderConfirmation = () => (
    <Box sx={{ textAlign: 'center', maxWidth: 400, mx: 'auto' }}>
      <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Ready to Go!
      </Typography>

      {selectedMode === 'password' ? (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your password has been set. You'll need to enter it each time you open the app.
        </Typography>
      ) : (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          No password required. The app will open directly to your dashboard.
        </Typography>
      )}

      <Stack spacing={2}>
        <Button onClick={handleBack} disabled={isLoading}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleComplete}
          disabled={isLoading}
        >
          {isLoading ? 'Setting up...' : 'Get Started'}
        </Button>
      </Stack>
    </Box>
  );

  // Render current step content
  const renderStepContent = () => {
    if (selectedMode === null) {
      return renderModeSelection();
    }

    if (selectedMode === 'none') {
      return renderConfirmation();
    }

    // Password mode steps
    switch (activeStep) {
      case 0:
        return renderModeSelection();
      case 1:
        return renderPasswordForm();
      case 2:
        return renderSecurityQuestions();
      case 3:
        return renderConfirmation();
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: isDark ? 'background.default' : 'grey.50',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 700, width: '100%', p: { xs: 2, sm: 4 } }}>
        {selectedMode === 'password' && (
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {(error || validationError) && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => { clearError(); setValidationError(null); }}>
            {error || validationError}
          </Alert>
        )}

        {renderStepContent()}
      </Card>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
        You can change these settings later in the app.
      </Typography>
    </Box>
  );
}
