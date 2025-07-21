import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function AIChat() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Assistant
      </Typography>
      <Alert severity="info">
        AI-powered metrics assistant - Coming soon!
      </Alert>
    </Box>
  );
}