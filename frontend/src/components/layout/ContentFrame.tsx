import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

interface ContentFrameProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const ContentFrame: React.FC<ContentFrameProps> = ({ children, title, subtitle }) => {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1440,
        mx: 'auto',
        px: mdUp ? 3 : 2,
        py: 2,
      }}
    >
      {title && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="subtitle1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      {children}
    </Box>
  );
};