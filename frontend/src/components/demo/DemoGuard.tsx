/**
 * Demo Guard Component
 *
 * Higher-order component that protects routes requiring demo authentication.
 * Redirects to onboarding if demo session not started.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useDemo } from '../../contexts/DemoContext';

interface DemoGuardProps {
  children: React.ReactNode;
}

export default function DemoGuard({ children }: DemoGuardProps) {
  const location = useLocation();
  const { isDemo, isDemoStarted, isDemoExpired, isLoading } = useDemo();

  // Show loading state while checking demo status
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Loading demo session...</Typography>
      </Box>
    );
  }

  // If not in demo mode at all, allow through (regular user)
  if (!isDemo) {
    return <>{children}</>;
  }

  // If demo expired, redirect to onboarding with expired message
  if (isDemoExpired) {
    return <Navigate to="/demo?expired=true" state={{ from: location }} replace />;
  }

  // If demo session exists but not started, redirect to onboarding
  if (!isDemoStarted) {
    return <Navigate to="/demo" state={{ from: location }} replace />;
  }

  // Demo is active and valid, render children
  return <>{children}</>;
}

/**
 * HOC wrapper for demo guard
 */
export function withDemoGuard<P extends object>(Component: React.ComponentType<P>) {
  return function DemoGuardedComponent(props: P) {
    return (
      <DemoGuard>
        <Component {...props} />
      </DemoGuard>
    );
  };
}
