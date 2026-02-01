/**
 * Login/Register Page Component
 *
 * Shows registration form if no users exist (first-time setup).
 * Shows login form if users exist.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite movie?",
  "What was the make of your first car?",
  "What street did you grow up on?",
];

type AuthMode = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, isLoading: authLoading, hasUsers } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Security questions for first admin
  const [securityQuestion1, setSecurityQuestion1] = useState('');
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');

  // Recovery key display
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [recoveryKeyCopied, setRecoveryKeyCopied] = useState(false);

  // Get the redirect path from location state, default to dashboard
  const from = (location.state as any)?.from?.pathname || '/app/dashboard';

  // Set initial mode based on whether users exist
  useEffect(() => {
    if (hasUsers === false) {
      setMode('register');
    } else if (hasUsers === true) {
      setMode('login');
    }
  }, [hasUsers]);

  // If already authenticated, redirect
  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  // Show loading while checking auth status
  if (authLoading || hasUsers === null) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
      // Validate security questions for first admin
      if (isFirstUser) {
        if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
          setError('Please complete both security questions');
          return;
        }
        if (securityQuestion1 === securityQuestion2) {
          setError('Please choose two different security questions');
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const result = await register(
          name,
          email,
          password,
          isFirstUser ? securityQuestion1 : undefined,
          isFirstUser ? securityAnswer1 : undefined,
          isFirstUser ? securityQuestion2 : undefined,
          isFirstUser ? securityAnswer2 : undefined
        );
        // If this is the first user, show the recovery key
        if (result?.recovery_key) {
          setRecoveryKey(result.recovery_key);
          return; // Don't navigate yet, show recovery key first
        }
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || `${mode === 'register' ? 'Registration' : 'Login'} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setRecoveryKeyCopied(true);
      setTimeout(() => setRecoveryKeyCopied(false), 2000);
    }
  };

  const handleRecoveryKeyAcknowledged = () => {
    setRecoveryKey(null);
    navigate(from, { replace: true });
  };

  const isFirstUser = hasUsers === false;

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
        <CardContent sx={{ p: 4 }}>
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img
              src="/logo-metricframe.svg"
              alt="MetricFrame"
              style={{ height: 48, marginBottom: 16 }}
            />
            {isFirstUser ? (
              <>
                <Typography variant="h5" component="h1" gutterBottom>
                  Welcome to MetricFrame
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create your admin account to get started
                </Typography>
              </>
            ) : mode === 'register' ? (
              <>
                <Typography variant="h5" component="h1" gutterBottom>
                  Create Account
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Register to access the dashboard
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" component="h1" gutterBottom>
                  Sign In
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your credentials to continue
                </Typography>
              </>
            )}
          </Box>

          {/* First user notice */}
          {isFirstUser && (
            <Alert severity="info" sx={{ mb: 3 }}>
              This is a fresh installation. The first account you create will have
              <strong> admin privileges</strong>.
            </Alert>
          )}

          {/* Invitation notice for non-first users */}
          {!isFirstUser && mode === 'register' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              You must be invited by an administrator to register. Enter the email address
              that was invited.
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <TextField
                fullWidth
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                margin="normal"
                required
                autoFocus
                autoComplete="name"
                disabled={loading}
              />
            )}

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoFocus={mode === 'login'}
              autoComplete="email"
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {mode === 'register' && (
              <TextField
                fullWidth
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="new-password"
                disabled={loading}
              />
            )}

            {/* Security Questions for First Admin */}
            {isFirstUser && mode === 'register' && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Security Questions (for password recovery)
                </Typography>

                <FormControl fullWidth margin="normal">
                  <InputLabel>Security Question 1</InputLabel>
                  <Select
                    value={securityQuestion1}
                    label="Security Question 1"
                    onChange={(e) => setSecurityQuestion1(e.target.value)}
                    disabled={loading}
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <MenuItem key={q} value={q} disabled={q === securityQuestion2}>
                        {q}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Answer 1"
                  value={securityAnswer1}
                  onChange={(e) => setSecurityAnswer1(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading || !securityQuestion1}
                  helperText="Answers are case-insensitive"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Security Question 2</InputLabel>
                  <Select
                    value={securityQuestion2}
                    label="Security Question 2"
                    onChange={(e) => setSecurityQuestion2(e.target.value)}
                    disabled={loading}
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <MenuItem key={q} value={q} disabled={q === securityQuestion1}>
                        {q}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Answer 2"
                  value={securityAnswer2}
                  onChange={(e) => setSecurityAnswer2(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading || !securityQuestion2}
                />
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={
                loading ||
                !email ||
                !password ||
                (mode === 'register' && (!name || !confirmPassword)) ||
                (mode === 'register' && isFirstUser && (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2))
              }
              startIcon={
                loading ? (
                  <CircularProgress size={20} />
                ) : mode === 'register' ? (
                  <RegisterIcon />
                ) : (
                  <LoginIcon />
                )
              }
              sx={{ mt: 3, mb: 2 }}
            >
              {loading
                ? mode === 'register'
                  ? 'Creating Account...'
                  : 'Signing in...'
                : mode === 'register'
                ? isFirstUser
                  ? 'Create Admin Account'
                  : 'Create Account'
                : 'Sign In'}
            </Button>
          </form>

          {/* Toggle between login/register (only if users exist) */}
          {!isFirstUser && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ textAlign: 'center' }}>
                {mode === 'login' ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Don't have an account?{' '}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => {
                          setMode('register');
                          setError(null);
                        }}
                      >
                        Create one
                      </Link>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => navigate('/forgot-password')}
                      >
                        Forgot password?
                      </Link>
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Already have an account?{' '}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                    >
                      Sign in
                    </Link>
                  </Typography>
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recovery Key Dialog - shown after first admin registration */}
      <Dialog open={!!recoveryKey} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          Save Your Recovery Key
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>Important:</strong> This recovery key will only be shown once. Save it in a secure
            location. You'll need it to recover your account if you forget your password.
          </Alert>

          <Paper
            sx={{
              p: 2,
              bgcolor: 'grey.100',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontSize: '1.2rem',
              letterSpacing: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                letterSpacing: 1,
              }}
            >
              {recoveryKey}
            </Typography>
            <IconButton onClick={handleCopyRecoveryKey} size="small">
              {recoveryKeyCopied ? <CheckIcon color="success" /> : <CopyIcon />}
            </IconButton>
          </Paper>

          {recoveryKeyCopied && (
            <Typography variant="caption" color="success.main" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Copied to clipboard!
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            You can also recover your account using the security questions you set up.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleRecoveryKeyAcknowledged}
            fullWidth
          >
            I've Saved My Recovery Key
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
