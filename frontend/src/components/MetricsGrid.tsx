import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function MetricsGrid() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Metrics Catalog
      </Typography>
      <Alert severity="info">
        Metrics catalog grid with inline editing - Coming soon!
      </Alert>
    </Box>
  );
}