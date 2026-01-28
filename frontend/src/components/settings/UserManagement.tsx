/**
 * UserManagement component for admin user role management.
 *
 * Provides a table view of all users with ability to:
 * - Create new users with name, email, and role
 * - Change user roles via dropdown (viewer/editor/admin)
 * - Activate/deactivate users via toggle
 * - View user details
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Select,
  MenuItem,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  Edit as EditIcon,
  Visibility as ViewerIcon,
} from '@mui/icons-material';
import { apiClient } from '../../api/client';

// ==============================================================================
// TYPES
// ==============================================================================

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface UserRecord {
  id: string;
  name: string;
  email: string | null;
  role: UserRole | null;
  active: boolean;
  selected_framework_id?: string | null;
  onboarding_completed?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface CreateUserFormData {
  name: string;
  email: string;
  role: UserRole;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// ==============================================================================
// ROLE DISPLAY HELPERS
// ==============================================================================

const ROLE_CONFIG: Record<UserRole, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; icon: React.ReactElement }> = {
  viewer: {
    label: 'Viewer',
    color: 'info',
    icon: <ViewerIcon fontSize="small" />,
  },
  editor: {
    label: 'Editor',
    color: 'primary',
    icon: <EditIcon fontSize="small" />,
  },
  admin: {
    label: 'Admin',
    color: 'error',
    icon: <AdminIcon fontSize="small" />,
  },
};

// ==============================================================================
// COMPONENT
// ==============================================================================

const UserManagement: React.FC = () => {
  // State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateUserFormData>({
    name: '',
    email: '',
    role: 'viewer',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getUsers();
      setUsers(response);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to load users';
      setError(message);
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Show snackbar helper
  const showSnackbar = (message: string, severity: SnackbarState['severity'] = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await apiClient.assignUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showSnackbar(`Role updated to ${ROLE_CONFIG[newRole].label}`);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update role';
      showSnackbar(message, 'error');
    }
  };

  // Handle active toggle
  const handleActiveToggle = async (userId: string, currentActive: boolean) => {
    try {
      if (currentActive) {
        // Deactivate (soft delete)
        await apiClient.deleteUser(userId);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, active: false } : u))
        );
        showSnackbar('User deactivated');
      } else {
        // Reactivate
        await apiClient.updateUser(userId, { active: true });
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, active: true } : u))
        );
        showSnackbar('User reactivated');
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update user status';
      showSnackbar(message, 'error');
    }
  };

  // Validate create form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!['viewer', 'editor', 'admin'].includes(formData.role)) {
      errors.role = 'Invalid role';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create user
  const handleCreateUser = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const newUser = await apiClient.createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      });
      setUsers((prev) => [...prev, newUser]);
      setCreateDialogOpen(false);
      setFormData({ name: '', email: '', role: 'viewer' });
      setFormErrors({});
      showSnackbar(`User '${newUser.name}' created successfully`);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to create user';
      showSnackbar(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Close dialog and reset
  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setFormData({ name: '', email: '', role: 'viewer' });
    setFormErrors({});
  };

  // ==============================================================================
  // RENDER
  // ==============================================================================

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading users...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchUsers}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user accounts and assign roles. Roles control access to metrics and catalog operations.
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh user list">
            <IconButton onClick={fetchUsers}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Users table */}
      {users.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Users Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create the first user to get started with role-based access control.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create First User
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Active</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{
                    opacity: user.active ? 1 : 0.6,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {user.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.email || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={user.role || 'viewer'}
                        onChange={(e: SelectChangeEvent) =>
                          handleRoleChange(user.id, e.target.value as UserRole)
                        }
                        disabled={!user.active}
                        size="small"
                        renderValue={(value) => {
                          const role = value as UserRole;
                          const config = ROLE_CONFIG[role];
                          return (
                            <Chip
                              label={config.label}
                              color={config.color}
                              size="small"
                              icon={config.icon}
                              variant="outlined"
                            />
                          );
                        }}
                      >
                        <MenuItem value="viewer">
                          <Box display="flex" alignItems="center" gap={1}>
                            <ViewerIcon fontSize="small" color="info" />
                            <Box>
                              <Typography variant="body2">Viewer</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Read-only access
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                        <MenuItem value="editor">
                          <Box display="flex" alignItems="center" gap={1}>
                            <EditIcon fontSize="small" color="primary" />
                            <Box>
                              <Typography variant="body2">Editor</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Create and edit metrics
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                        <MenuItem value="admin">
                          <Box display="flex" alignItems="center" gap={1}>
                            <AdminIcon fontSize="small" color="error" />
                            <Box>
                              <Typography variant="body2">Admin</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Full access including user management
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={user.active ? 'Deactivate user' : 'Reactivate user'}>
                      <Switch
                        checked={user.active}
                        onChange={() => handleActiveToggle(user.id, user.active)}
                        color="success"
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary */}
      <Box mt={2} display="flex" gap={2}>
        <Typography variant="caption" color="text.secondary">
          Total: {users.length} users
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Active: {users.filter((u) => u.active).length}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Admins: {users.filter((u) => u.role === 'admin').length}
        </Typography>
      </Box>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAddIcon />
            Create New User
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!formErrors.name}
              helperText={formErrors.name}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!formErrors.email}
              helperText={formErrors.email}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e: SelectChangeEvent) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
              >
                <MenuItem value="viewer">Viewer (read-only)</MenuItem>
                <MenuItem value="editor">Editor (create/edit metrics)</MenuItem>
                <MenuItem value="admin">Admin (full access)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {submitting ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
