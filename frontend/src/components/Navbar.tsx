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
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TableChart as MetricsIcon,
  SmartToy as AIIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
  Storage as StorageIcon,
  MenuBook as DocsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

import { NavItem } from '../types';

export const drawerWidthExpanded = 240;
export const drawerWidthCollapsed = 64;

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
    label: 'Documentation',
    path: '/docs',
    icon: DocsIcon,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: SettingsIcon,
  },
];

interface NavbarProps {
  window?: () => Window;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Navbar({ window, collapsed, onToggleCollapse }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const drawerWidth = collapsed ? drawerWidthCollapsed : drawerWidthExpanded;

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Toggle button - positioned on the right edge, vertically centered */}
      <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
        <IconButton
          onClick={onToggleCollapse}
          size="small"
          sx={{
            position: 'absolute',
            right: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            width: 24,
            height: 24,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Toolbar
        sx={{
          py: 1,
          minHeight: 64,
          justifyContent: 'center',
          px: collapsed ? 0 : 2,
        }}
      >
        {collapsed ? (
          <img
            src="/favicon-metricframe.svg"
            alt="MetricFrame"
            style={{ height: 28, width: 28 }}
          />
        ) : (
          <img
            src="/logo-metricframe.svg"
            alt="MetricFrame"
            style={{ height: 40, width: 'auto', maxWidth: '100%' }}
          />
        )}
      </Toolbar>

      <Divider />

      {!collapsed && (
        <Box sx={{ p: 2 }}>
          <Chip
            label="Local Environment"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        </Box>
      )}

      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => {
          const isSelected = location.pathname === item.path ||
            (item.path === '/dashboard' && location.pathname === '/');

          const listItemButton = (
            <ListItemButton
              selected={isSelected}
              onClick={() => navigate(item.path)}
              sx={{
                mx: collapsed ? 0.5 : 1,
                borderRadius: 1,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1.5 : 2,
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
                  minWidth: collapsed ? 'auto' : 40,
                  mr: collapsed ? 0 : 1,
                }}
              >
                <item.icon />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.label} disablePadding>
              {collapsed ? (
                <Tooltip title={item.label} placement="right" arrow>
                  {listItemButton}
                </Tooltip>
              ) : (
                listItemButton
              )}
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {!collapsed && (
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Powered by NIST CSF 2.0
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            & NIST AI RMF
          </Typography>
        </Box>
      )}
    </Box>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: drawerWidth },
        flexShrink: { sm: 0 },
        transition: 'width 0.2s ease-in-out',
      }}
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
            transition: 'width 0.2s ease-in-out',
            overflowX: 'hidden',
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
}