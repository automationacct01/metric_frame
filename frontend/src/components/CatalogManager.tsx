import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as InactiveIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Upload as UploadIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { ContentFrame } from './layout';
import { apiClient } from '../api/client';

interface Catalog {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  active: boolean;
  is_default: boolean;
  file_format?: string;
  original_filename?: string;
  items_count: number;
  created_at: string;
  updated_at: string;
}

const CatalogManager: React.FC = () => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, catalog: Catalog | null}>({
    open: false,
    catalog: null
  });
  const [cloneDialog, setCloneDialog] = useState<{
    open: boolean;
    catalog: Catalog | null;
    newName: string;
    description: string;
    clearCurrentValues: boolean;
    loading: boolean;
  }>({
    open: false,
    catalog: null,
    newName: '',
    description: '',
    clearCurrentValues: true,
    loading: false,
  });

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const catalogsData = await apiClient.getCatalogs();

      // Add default demo catalog - this is a comprehensive sample catalog
      const defaultCatalog: Catalog = {
        id: 'default',
        name: 'default-demo',
        description: 'A comprehensive demo catalog with 356 pre-configured metrics covering NIST CSF 2.0 and AI RMF frameworks. This catalog includes sample data for demonstration purposes. To use these metrics for your own tracking, click "Copy to My Catalogs" to create your own editable version with cleared values.',
        owner: 'system',
        active: catalogsData.length === 0 || !catalogsData.some(c => c.active),
        is_default: true,
        items_count: 356,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      setCatalogs([defaultCatalog, ...catalogsData]);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load catalogs');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCatalog = async (catalogId: string) => {
    try {
      setActivatingId(catalogId);
      setError(null);

      if (catalogId === 'default') {
        // Deactivate all custom catalogs to return to default
        const activeCatalog = catalogs.find(c => c.active && !c.is_default);
        if (activeCatalog) {
          await apiClient.activateCatalog(activeCatalog.id, false);
        }
      } else {
        await apiClient.activateCatalog(catalogId, true);
      }

      await fetchCatalogs();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to activate catalog');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeleteCatalog = async (catalog: Catalog) => {
    try {
      setError(null);
      await apiClient.deleteCatalog(catalog.id);
      await fetchCatalogs();
      setDeleteDialog({ open: false, catalog: null });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete catalog');
    }
  };

  const openCloneDialog = (catalog: Catalog) => {
    const suggestedName = catalog.is_default
      ? 'My Metrics Catalog'
      : `${catalog.name} (Copy)`;
    setCloneDialog({
      open: true,
      catalog,
      newName: suggestedName,
      description: catalog.is_default
        ? 'My customized metrics catalog based on the default demo'
        : `Copy of ${catalog.name}`,
      clearCurrentValues: true,
      loading: false,
    });
  };

  const handleCloneCatalog = async () => {
    if (!cloneDialog.catalog || !cloneDialog.newName.trim()) return;

    try {
      setCloneDialog(prev => ({ ...prev, loading: true }));
      setError(null);

      let result;
      if (cloneDialog.catalog.is_default) {
        // Clone from default system metrics
        result = await apiClient.cloneDefaultCatalog(
          cloneDialog.newName.trim(),
          cloneDialog.description.trim() || undefined,
          cloneDialog.clearCurrentValues
        );
      } else {
        // Clone from existing custom catalog
        result = await apiClient.cloneCatalog(
          cloneDialog.catalog.id,
          cloneDialog.newName.trim(),
          cloneDialog.description.trim() || undefined,
          cloneDialog.clearCurrentValues
        );
      }

      setSuccessMessage(`Successfully created "${result.name}" with ${result.items_cloned} metrics. You can now activate it to start tracking your own data.`);
      setCloneDialog({
        open: false,
        catalog: null,
        newName: '',
        description: '',
        clearCurrentValues: true,
        loading: false,
      });
      await fetchCatalogs();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to clone catalog');
      setCloneDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const getStatusColor = (catalog: Catalog) => {
    if (catalog.active) return 'success';
    if (catalog.is_default) return 'primary';
    return 'default';
  };

  const getStatusLabel = (catalog: Catalog) => {
    if (catalog.active) return 'Active';
    if (catalog.is_default) return 'Default';
    return 'Inactive';
  };

  if (loading) {
    return (
      <ContentFrame title="Catalog Manager" subtitle="Manage your metrics catalogs">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </ContentFrame>
    );
  }

  return (
    <ContentFrame 
      title="Catalog Manager" 
      subtitle="Manage and switch between different metrics catalogs"
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            <AlertTitle>Success</AlertTitle>
            {successMessage}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>About Catalogs</AlertTitle>
          Switch between different metrics catalogs to customize your cybersecurity risk scoring.
          Only one catalog can be active at a time. The <strong>default-demo</strong> catalog provides
          a comprehensive set of sample metrics - use "Copy to My Catalogs" to create your own editable version.
        </Alert>

        <Grid container spacing={3}>
          {catalogs.map((catalog) => (
            <Grid item xs={12} md={6} lg={4} key={catalog.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: catalog.active ? 2 : 1,
                  borderColor: catalog.active ? 'success.main' : 'divider',
                  position: 'relative',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {catalog.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip
                          size="small"
                          label={getStatusLabel(catalog)}
                          color={getStatusColor(catalog)}
                          icon={catalog.active ? <CheckCircleIcon /> : <InactiveIcon />}
                        />
                        {catalog.is_default && (
                          <Chip
                            size="small"
                            label="Demo"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={catalog.is_default ? "Copy to My Catalogs" : "Clone catalog"}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openCloneDialog(catalog)}
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                      {!catalog.is_default && (
                        <Tooltip title="Delete catalog">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, catalog })}
                            disabled={catalog.active}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {catalog.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {catalog.description}
                    </Typography>
                  )}

                  <List dense>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <AssessmentIcon color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Metrics"
                        secondary={
                          catalog.is_default
                            ? `${catalog.items_count} total metrics`
                            : `${catalog.items_count} metrics`
                        }
                      />
                    </ListItem>
                    {catalog.is_default && (
                      <>
                        <ListItem disablePadding sx={{ pl: 4.5 }}>
                          <ListItemText
                            secondary="276 NIST CSF 2.0"
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                        <ListItem disablePadding sx={{ pl: 4.5 }}>
                          <ListItemText
                            secondary="80 NIST AI RMF"
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      </>
                    )}
                    
                    {catalog.file_format && (
                      <ListItem disablePadding>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <InfoIcon color="action" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Source"
                          secondary={`${catalog.file_format.toUpperCase()} file: ${catalog.original_filename}`}
                        />
                      </ListItem>
                    )}
                    
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <StorageIcon color="action" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Owner"
                        secondary={catalog.owner || 'System'}
                      />
                    </ListItem>
                  </List>
                </CardContent>

                <Divider />

                <CardActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
                  {catalog.is_default && (
                    <Button
                      variant="contained"
                      color="secondary"
                      fullWidth
                      onClick={() => openCloneDialog(catalog)}
                      startIcon={<CopyIcon />}
                    >
                      Copy to My Catalogs
                    </Button>
                  )}
                  <Button
                    variant={catalog.active ? "outlined" : catalog.is_default ? "outlined" : "contained"}
                    color={catalog.active ? "success" : "primary"}
                    fullWidth
                    disabled={catalog.active || activatingId === catalog.id}
                    onClick={() => handleActivateCatalog(catalog.id)}
                    startIcon={
                      activatingId === catalog.id ?
                        <CircularProgress size={16} /> :
                        catalog.active ?
                          <CheckCircleIcon /> :
                          <UploadIcon />
                    }
                  >
                    {activatingId === catalog.id
                      ? 'Activating...'
                      : catalog.active
                        ? 'Currently Active'
                        : 'Activate'
                    }
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {catalogs.filter(c => !c.is_default).length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <StorageIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Custom Catalogs
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You haven't imported any custom metrics catalogs yet.
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              href="/catalog-wizard"
            >
              Import Your First Catalog
            </Button>
          </Box>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, catalog: null })}
        >
          <DialogTitle>Delete Catalog</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the catalog "{deleteDialog.catalog?.name}"?
              This action cannot be undone.
            </Typography>
            {deleteDialog.catalog?.active && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This catalog is currently active. Deleting it will switch back to the default catalog.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialog({ open: false, catalog: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteDialog.catalog && handleDeleteCatalog(deleteDialog.catalog)}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clone Catalog Dialog */}
        <Dialog
          open={cloneDialog.open}
          onClose={() => !cloneDialog.loading && setCloneDialog(prev => ({ ...prev, open: false }))}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {cloneDialog.catalog?.is_default
              ? 'Copy Default Demo to My Catalogs'
              : `Clone "${cloneDialog.catalog?.name}"`}
          </DialogTitle>
          <DialogContent>
            {cloneDialog.catalog?.is_default && (
              <Alert severity="info" sx={{ mb: 3 }}>
                This will create a personal copy of all {cloneDialog.catalog?.items_count} metrics from the
                default demo catalog. Current values will be cleared so you can start fresh with your own data.
              </Alert>
            )}

            <TextField
              autoFocus
              margin="dense"
              label="New Catalog Name"
              fullWidth
              variant="outlined"
              value={cloneDialog.newName}
              onChange={(e) => setCloneDialog(prev => ({ ...prev, newName: e.target.value }))}
              disabled={cloneDialog.loading}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Description (optional)"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={cloneDialog.description}
              onChange={(e) => setCloneDialog(prev => ({ ...prev, description: e.target.value }))}
              disabled={cloneDialog.loading}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={cloneDialog.clearCurrentValues}
                  onChange={(e) => setCloneDialog(prev => ({
                    ...prev,
                    clearCurrentValues: e.target.checked
                  }))}
                  disabled={cloneDialog.loading}
                />
              }
              label="Clear current values (recommended - start with a clean slate)"
            />

            {!cloneDialog.clearCurrentValues && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Keeping current values will copy the demo data. This is useful for testing but
                you'll likely want to update all values to reflect your actual metrics.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setCloneDialog(prev => ({ ...prev, open: false }))}
              disabled={cloneDialog.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloneCatalog}
              color="primary"
              variant="contained"
              disabled={!cloneDialog.newName.trim() || cloneDialog.loading}
              startIcon={cloneDialog.loading ? <CircularProgress size={16} /> : <CopyIcon />}
            >
              {cloneDialog.loading ? 'Creating...' : 'Create My Catalog'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ContentFrame>
  );
};

export default CatalogManager;