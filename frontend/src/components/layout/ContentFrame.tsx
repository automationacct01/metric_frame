import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useDemo } from '../../contexts/DemoContext';

interface ContentFrameProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: number | string | false;  // false = no max width limit
}

export const ContentFrame: React.FC<ContentFrameProps> = ({
  children,
  title,
  subtitle,
  maxWidth = 1800  // Increased default from 1440
}) => {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  // Add extra top padding when demo banner is visible
  const { isDemo, isDemoStarted } = useDemo();
  const showDemoBanner = isDemo && isDemoStarted;
  const demoTopPadding = showDemoBanner ? 6 : 0; // 48px extra when demo banner visible

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: maxWidth === false ? 'none' : maxWidth,
        mx: 'auto',
        px: mdUp ? 3 : 2,
        pt: 2 + demoTopPadding,
        pb: 2,
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