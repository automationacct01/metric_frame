/**
 * Desktop Login Screen
 *
 * Simple password-only login for the desktop app.
 * Shows when auth_mode is 'password' and user is not authenticated.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Link,
  useTheme,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useDesktopAuth } from '../../contexts/DesktopAuthContext';

interface DesktopLoginProps {
  onForgotPassword: () => void;
}

export default function DesktopLogin({ onForgotPassword }: DesktopLoginProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { login, isLoading, error, clearError } = useDesktopAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!password.trim()) {
      setLocalError('Please enter your password');
      return;
    }

    try {
      await login(password);
      // On success, context updates and App.tsx redirects to dashboard
    } catch {
      // Error is handled by context
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password) {
      handleSubmit(e);
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
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <LockIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight={600}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your password to unlock MetricFrame
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
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
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
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={isLoading || !password}
            >
              {isLoading ? 'Unlocking...' : 'Unlock'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link
              component="button"
              variant="body2"
              onClick={onForgotPassword}
              sx={{ cursor: 'pointer' }}
            >
              Forgot password?
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
