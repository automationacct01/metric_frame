import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

interface ContentFrameProps {
  children: React.ReactNode;
}

export const ContentFrame: React.FC<ContentFrameProps> = ({ children }) => {
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
      {children}
    </Box>
  );
};