import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function Settings() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Alert severity="info">
        Application settings and configuration - Coming soon!
      </Alert>
    </Box>
  );
}