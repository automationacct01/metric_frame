/**
 * Desktop Forgot Password Screen
 *
 * Password recovery using security questions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Visibility,
  VisibilityOff,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useDesktopAuth } from '../../contexts/DesktopAuthContext';

interface DesktopForgotPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function DesktopForgotPassword({ onBack, onSuccess }: DesktopForgotPasswordProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { getRecoveryQuestions, resetPassword, isLoading, error, clearError } = useDesktopAuth();

  // State
  const [step, setStep] = useState<'loading' | 'questions' | 'success'>('loading');
  const [question1, setQuestion1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Load questions on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const questions = await getRecoveryQuestions();
        setQuestion1(questions.question_1);
        setQuestion2(questions.question_2);
        setStep('questions');
      } catch (err) {
        setLocalError('Failed to load security questions');
      }
    };
    loadQuestions();
  }, [getRecoveryQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Validation
    if (!answer1.trim() || !answer2.trim()) {
      setLocalError('Please answer both security questions');
      return;
    }
    if (newPassword.length < 8) {
      setLocalError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await resetPassword(answer1, answer2, newPassword);
      setStep('success');
    } catch {
      // Error is handled by context
    }
  };

  // Loading state
  if (step === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isDark ? 'background.default' : 'grey.50',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Success state
  if (step === 'success') {
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
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Password Reset!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your password has been successfully reset. You can now log in with your new password.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={onSuccess}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Questions form
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
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ mb: 2 }}
          >
            Back to Login
          </Button>

          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <SecurityIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight={600}>
              Reset Your Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Answer your security questions to reset your password
            </Typography>
          </Box>

          {(error || localError) && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => { clearError(); setLocalError(null); }}
            >
              {error || localError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Question 1 */}
              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                  {question1}
                </Typography>
                <TextField
                  fullWidth
                  label="Answer 1"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  disabled={isLoading}
                  helperText="Answers are not case-sensitive"
                />
              </Box>

              {/* Question 2 */}
              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                  {question2}
                </Typography>
                <TextField
                  fullWidth
                  label="Answer 2"
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  disabled={isLoading}
                />
              </Box>

              {/* New Password */}
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                helperText="Minimum 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={isLoading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Confirm Password */}
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                type="submit"
                disabled={isLoading || !answer1 || !answer2 || !newPassword || !confirmPassword}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
