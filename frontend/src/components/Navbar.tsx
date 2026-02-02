import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
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
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
  Key as KeyIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

import { NavItem } from '../types';

export const drawerWidthExpanded = 240;
export const drawerWidthCollapsed = 64;

interface ExtendedNavItem extends NavItem {
  adminOnly?: boolean;
}

const navItems: ExtendedNavItem[] = [
  {
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: DashboardIcon,
  },
  {
    label: 'Metrics Catalog',
    path: '/app/metrics',
    icon: MetricsIcon,
  },
  {
    label: 'AI Assistant',
    path: '/app/ai-assistant',
    icon: AIIcon,
  },
  {
    label: 'Import Catalog',
    path: '/app/catalog-wizard',
    icon: UploadIcon,
  },
  {
    label: 'Manage Catalogs',
    path: '/app/catalog-manager',
    icon: StorageIcon,
  },
  {
    label: 'Documentation',
    path: '/app/docs',
    icon: DocsIcon,
  },
  {
    label: 'Settings',
    path: '/app/settings',
    icon: SettingsIcon,
    adminOnly: true,
  },
];

interface NavbarProps {
  window?: () => Window;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// Use relative path for Vite proxy in development
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/v1\/?$/, '');
  }
  return '';
};
const API_BASE = getApiBase();

export default function Navbar({ window, collapsed, onToggleCollapse }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useThemeMode();
  const { user, logout, isAdmin, token } = useAuth();

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  // Change password dialog state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/auth/change-password?token=${token}&current_password=${encodeURIComponent(currentPassword)}&new_password=${encodeURIComponent(newPassword)}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setChangePasswordOpen(false);
        resetPasswordForm();
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handleClosePasswordDialog = () => {
    setChangePasswordOpen(false);
    resetPasswordForm();
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'editor':
        return 'primary';
      default:
        return 'default';
    }
  };

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
        {filteredNavItems.map((item) => {
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

      {/* Dark Mode Toggle */}
      <Box sx={{ p: collapsed ? 1 : 2, display: 'flex', justifyContent: 'center' }}>
        <Tooltip title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} placement="right">
          <IconButton
            onClick={toggleDarkMode}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        {!collapsed && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1, alignSelf: 'center', cursor: 'pointer' }}
            onClick={toggleDarkMode}
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* User Info & Logout */}
      {user && (
        <Box sx={{ p: collapsed ? 1 : 2 }}>
          {collapsed ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Tooltip title={`${user.name} (${user.role})`} placement="right">
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '0.75rem',
                    bgcolor: user.role === 'admin' ? 'error.main' : user.role === 'editor' ? 'primary.main' : 'grey.500',
                  }}
                >
                  {getInitials(user.name)}
                </Avatar>
              </Tooltip>
              <Tooltip title="Change password" placement="right">
                <IconButton
                  onClick={() => setChangePasswordOpen(true)}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <KeyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sign out" placement="right">
                <IconButton
                  onClick={handleLogout}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: '0.875rem',
                    bgcolor: user.role === 'admin' ? 'error.main' : user.role === 'editor' ? 'primary.main' : 'grey.500',
                  }}
                >
                  {getInitials(user.name)}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" fontWeight="medium" noWrap>
                    {user.name}
                  </Typography>
                  <Chip
                    label={user.role}
                    size="small"
                    color={getRoleColor(user.role) as any}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                </Box>
              </Box>
              <Box
                onClick={() => setChangePasswordOpen(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                  py: 0.5,
                }}
              >
                <KeyIcon fontSize="small" />
                <Typography variant="caption">Change password</Typography>
              </Box>
              <Box
                onClick={handleLogout}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                  py: 0.5,
                }}
              >
                <LogoutIcon fontSize="small" />
                <Typography variant="caption">Sign out</Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={handleClosePasswordDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordSuccess ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Password changed successfully!
            </Alert>
          ) : (
            <>
              {passwordError && (
                <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                  {passwordError}
                </Alert>
              )}
              <TextField
                fullWidth
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                margin="normal"
                disabled={passwordLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                        size="small"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                disabled={passwordLoading}
                helperText="Minimum 4 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                        size="small"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                margin="normal"
                disabled={passwordLoading}
                error={confirmNewPassword !== '' && newPassword !== confirmNewPassword}
                helperText={
                  confirmNewPassword !== '' && newPassword !== confirmNewPassword
                    ? 'Passwords do not match'
                    : ''
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} disabled={passwordLoading}>
            {passwordSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!passwordSuccess && (
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmNewPassword}
            >
              {passwordLoading ? <CircularProgress size={20} /> : 'Change Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
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