/**
 * Forgot Password Page Component
 *
 * Allows users to recover their password using either:
 * 1. Recovery key (generated during admin registration)
 * 2. Security questions
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Key as KeyIcon,
  QuestionAnswer as QuestionsIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';

// Use relative path for Vite proxy in development
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/v1\/?$/, '');
  }
  return '';
};
const API_BASE = getApiBase();

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Recovery key state
  const [recoveryKey, setRecoveryKey] = useState('');

  // Security questions state
  const [questions, setQuestions] = useState<{ question_1: string; question_2: string } | null>(null);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError(null);
    setQuestions(null);
    setAnswer1('');
    setAnswer2('');
  };

  const handleFetchQuestions = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setQuestionsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/recovery-questions/${encodeURIComponent(email)}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to fetch security questions');
      }

      const data = await response.json();
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleRecoverWithKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !recoveryKey || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/recover-with-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          recovery_key: recoveryKey,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverWithQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !answer1 || !answer2 || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/recover-with-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          answer_1: answer1,
          answer_2: answer2,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 450, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your password has been reset successfully!
            </Alert>
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/login')}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}
            >
              <BackIcon fontSize="small" />
              Back to Login
            </Link>
            <Typography variant="h5" component="h1" gutterBottom>
              Reset Your Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a recovery method below
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Email field - common to both methods */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoFocus
            disabled={loading}
          />

          <Divider sx={{ my: 2 }} />

          {/* Recovery Method Tabs */}
          <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
            <Tab icon={<KeyIcon />} label="Recovery Key" />
            <Tab icon={<QuestionsIcon />} label="Security Questions" />
          </Tabs>

          {/* Recovery Key Tab */}
          <TabPanel value={tab} index={0}>
            <form onSubmit={handleRecoverWithKey}>
              <TextField
                fullWidth
                label="Recovery Key"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                helperText="Enter the recovery key you saved during registration"
              />

              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                error={confirmPassword !== '' && newPassword !== confirmPassword}
                helperText={
                  confirmPassword !== '' && newPassword !== confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !email || !recoveryKey || !newPassword || !confirmPassword}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>
            </form>
          </TabPanel>

          {/* Security Questions Tab */}
          <TabPanel value={tab} index={1}>
            {!questions ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter your email above, then click below to load your security questions.
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleFetchQuestions}
                  disabled={questionsLoading || !email}
                >
                  {questionsLoading ? <CircularProgress size={24} /> : 'Load Security Questions'}
                </Button>
              </Box>
            ) : (
              <form onSubmit={handleRecoverWithQuestions}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {questions.question_1}
                </Typography>
                <TextField
                  fullWidth
                  label="Answer 1"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                  helperText="Answers are case-insensitive"
                />

                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  {questions.question_2}
                </Typography>
                <TextField
                  fullWidth
                  label="Answer 2"
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                />

                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                  error={confirmPassword !== '' && newPassword !== confirmPassword}
                  helperText={
                    confirmPassword !== '' && newPassword !== confirmPassword
                      ? 'Passwords do not match'
                      : ''
                  }
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !answer1 || !answer2 || !newPassword || !confirmPassword}
                  sx={{ mt: 3 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                </Button>
              </form>
            )}
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
