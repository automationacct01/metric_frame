import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TableChart as MetricsIcon,
  SmartToy as AIIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Upload as UploadIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

import { NavItem } from '../types';

const drawerWidth = 240;

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon,
  },
  {
    label: 'Metrics Catalog',
    path: '/metrics',
    icon: MetricsIcon,
  },
  {
    label: 'Import Catalog',
    path: '/catalog-wizard',
    icon: UploadIcon,
  },
  {
    label: 'Manage Catalogs',
    path: '/catalog-manager',
    icon: StorageIcon,
  },
  {
    label: 'AI Assistant',
    path: '/ai-assistant',
    icon: AIIcon,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: SettingsIcon,
  },
];

interface NavbarProps {
  window?: () => Window;
}

export default function Navbar({ window }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const drawer = (
    <div>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              NIST CSF 2.0
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Metrics Dashboard
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Chip
          label="Local Environment"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Box>

      <List>
        {navItems.map((item) => {
          const isSelected = location.pathname === item.path || 
            (item.path === '/dashboard' && location.pathname === '/');
          
          return (
            <ListItem key={item.label} disablePadding>
              <ListItemButton
                selected={isSelected}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isSelected ? 'inherit' : 'inherit',
                    minWidth: 40,
                  }}
                >
                  <item.icon />
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mt: 2 }} />
      
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Cybersecurity Framework 2.0
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Risk Metrics Management
        </Typography>
      </Box>
    </div>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="navigation menu"
    >
      <Drawer
        container={container}
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            backgroundColor: 'background.paper',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
}