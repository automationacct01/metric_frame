/**
 * UserManagement component for admin user role management.
 *
 * Provides a table view of all users with ability to:
 * - Invite new users by email with assigned role
 * - Change user roles via dropdown (viewer/editor/admin)
 * - Activate/deactivate users via toggle
 * - Delete users
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
  InputAdornment,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  Edit as EditIcon,
  Visibility as ViewerIcon,
  VisibilityOff,
  Delete as DeleteIcon,
  HourglassEmpty as PendingIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ==============================================================================
// TYPES
// ==============================================================================

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  pending: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

interface InviteFormData {
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
  const { token, user: currentUser } = useAuth();

  // State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InviteFormData>({
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);

  // Reset password dialog state
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch users using auth endpoint
  const fetchUsers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/users?token=${token}`);
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      const message = err.message || 'Failed to load users';
      setError(message);
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Show snackbar helper
  const showSnackbar = (message: string, severity: SnackbarState['severity'] = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/users/${userId}/role?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showSnackbar(`Role updated to ${ROLE_CONFIG[newRole].label}`);
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to update role', 'error');
    }
  };

  // Handle active toggle
  const handleActiveToggle = async (user: UserRecord) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/auth/users/${user.id}/active?token=${token}&active=${!user.active}`,
        { method: 'PUT' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update user status');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
      );
      showSnackbar(user.active ? 'User deactivated' : 'User activated');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to update user status', 'error');
    }
  };

  // Validate invite form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

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

  // Handle invite user
  const handleInviteUser = async () => {
    if (!validateForm() || !token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/invite?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to invite user');
      }

      setInviteDialogOpen(false);
      setFormData({ email: '', role: 'viewer' });
      setFormErrors({});
      showSnackbar(`Invitation sent to ${formData.email}`);
      fetchUsers();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to invite user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete || !token) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/auth/users/${userToDelete.id}?token=${token}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showSnackbar(`User ${userToDelete.email} deleted`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to delete user', 'error');
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    if (!userToReset || !token || !newPassword) return;

    if (newPassword !== confirmPassword) {
      showSnackbar('Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 4) {
      showSnackbar('Password must be at least 4 characters', 'error');
      return;
    }

    setResetLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/auth/reset-password/${userToReset.id}?token=${token}&new_password=${encodeURIComponent(newPassword)}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to reset password');
      }

      showSnackbar(`Password reset for ${userToReset.email}`);
      handleCloseResetDialog();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to reset password', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Close reset password dialog
  const handleCloseResetDialog = () => {
    setResetPasswordOpen(false);
    setUserToReset(null);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  // Close dialog and reset
  const handleCloseDialog = () => {
    setInviteDialogOpen(false);
    setFormData({ email: '', role: 'viewer' });
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
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invite users by email and assign roles. Users must register with the invited email to access the application.
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
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite User
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
            Invite users to give them access to the application.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite First User
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Login</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
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
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {user.name || '(Pending Registration)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={user.role}
                        onChange={(e: SelectChangeEvent) =>
                          handleRoleChange(user.id, e.target.value as UserRole)
                        }
                        disabled={!user.active || user.id === currentUser?.id}
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
                                Read-only access to dashboards
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
                                Create and edit metrics/catalogs
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
                                Full access + user management
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    {user.pending ? (
                      <Chip
                        icon={<PendingIcon />}
                        label="Pending"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    ) : (
                      <Tooltip title={user.active ? 'Deactivate user' : 'Reactivate user'}>
                        <Switch
                          checked={user.active}
                          onChange={() => handleActiveToggle(user)}
                          color="success"
                          size="small"
                          disabled={user.id === currentUser?.id}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Reset password">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setUserToReset(user);
                          setResetPasswordOpen(true);
                        }}
                        disabled={user.pending}
                      >
                        <KeyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete user">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={user.id === currentUser?.id}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
          Active: {users.filter((u) => u.active && !u.pending).length}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Pending: {users.filter((u) => u.pending).length}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Admins: {users.filter((u) => u.role === 'admin').length}
        </Typography>
      </Box>

      {/* Invite User Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAddIcon />
            Invite New User
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the email address of the person you want to invite. They will be able to register
            using this email address and will be assigned the selected role.
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!formErrors.email}
              helperText={formErrors.email}
              fullWidth
              required
              autoFocus
              placeholder="user@example.com"
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
                <MenuItem value="viewer">
                  <Box display="flex" alignItems="center" gap={1}>
                    <ViewerIcon fontSize="small" />
                    Viewer - Read-only access to dashboards
                  </Box>
                </MenuItem>
                <MenuItem value="editor">
                  <Box display="flex" alignItems="center" gap={1}>
                    <EditIcon fontSize="small" />
                    Editor - Create and edit metrics/catalogs
                  </Box>
                </MenuItem>
                <MenuItem value="admin">
                  <Box display="flex" alignItems="center" gap={1}>
                    <AdminIcon fontSize="small" />
                    Admin - Full access including user management
                  </Box>
                </MenuItem>
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
            onClick={handleInviteUser}
            disabled={submitting || !formData.email}
            startIcon={submitting ? <CircularProgress size={16} /> : <PersonAddIcon />}
          >
            {submitting ? 'Inviting...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          {userToDelete && (
            <Typography>
              Are you sure you want to delete <strong>{userToDelete.email}</strong>? This action
              cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onClose={handleCloseResetDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          {userToReset && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set a new password for <strong>{userToReset.email}</strong>
              </Typography>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                disabled={resetLoading}
                helperText="Minimum 4 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <ViewerIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                disabled={resetLoading}
                error={confirmPassword !== '' && newPassword !== confirmPassword}
                helperText={
                  confirmPassword !== '' && newPassword !== confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog} disabled={resetLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={resetLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          >
            {resetLoading ? <CircularProgress size={20} /> : 'Reset Password'}
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
