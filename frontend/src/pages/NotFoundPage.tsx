import { Box, Typography, Button, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Dashboard as DashboardIcon } from '@mui/icons-material';

interface NotFoundPageProps {
  inApp?: boolean;
}

export default function NotFoundPage({ inApp = false }: NotFoundPageProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: inApp ? '60vh' : '100vh',
        textAlign: 'center',
        px: 3,
        bgcolor: inApp ? 'transparent' : 'background.default',
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '4rem', sm: '6rem' },
          fontWeight: 700,
          color: isDark ? 'grey.600' : 'grey.300',
          lineHeight: 1,
          mb: 1,
        }}
      >
        404
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button
        variant="contained"
        size="large"
        startIcon={inApp ? <DashboardIcon /> : <HomeIcon />}
        onClick={() => navigate(inApp ? '/app/dashboard' : '/')}
        sx={{ textTransform: 'none' }}
      >
        {inApp ? 'Back to Dashboard' : 'Back to Home'}
      </Button>
    </Box>
  );
}
