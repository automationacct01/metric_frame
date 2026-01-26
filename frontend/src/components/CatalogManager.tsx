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
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as InactiveIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Upload as UploadIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
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
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, catalog: Catalog | null}>({
    open: false,
    catalog: null
  });

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const catalogsData = await apiClient.getCatalogs();
      
      // Add mock default catalog for demonstration
      const defaultCatalog: Catalog = {
        id: 'default',
        name: 'Default System Metrics',
        description: 'Pre-configured metrics for both NIST Cybersecurity Framework 2.0 and NIST AI Risk Management Framework',
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
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>About Catalogs</AlertTitle>
          Switch between different metrics catalogs to customize your cybersecurity risk scoring. 
          Only one catalog can be active at a time.
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
                      <Chip
                        size="small"
                        label={getStatusLabel(catalog)}
                        color={getStatusColor(catalog)}
                        icon={catalog.active ? <CheckCircleIcon /> : <InactiveIcon />}
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    
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

                <CardActions sx={{ p: 2 }}>
                  <Button
                    variant={catalog.active ? "outlined" : "contained"}
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
      </Box>
    </ContentFrame>
  );
};

export default CatalogManager;