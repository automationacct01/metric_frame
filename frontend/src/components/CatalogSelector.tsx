import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';

interface Catalog {
  id: string;
  name: string;
  active: boolean;
  is_default: boolean;
  items_count: number;
  owner?: string;
}

interface CatalogSelectorProps {
  onCatalogChange?: (catalogId: string | null) => void;
  selectedCatalogId?: string | null;
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
}

const CatalogSelector: React.FC<CatalogSelectorProps> = ({
  onCatalogChange,
  selectedCatalogId,
  variant = 'outlined',
  size = 'small',
}) => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const catalogsData = await apiClient.getCatalogs();
      
      // Add mock default catalog
      const defaultCatalog: Catalog = {
        id: 'default',
        name: 'Default NIST CSF 2.0 Metrics',
        active: catalogsData.length === 0 || !catalogsData.some(c => c.active),
        is_default: true,
        items_count: 208,
        owner: 'system',
      };

      const allCatalogs = [defaultCatalog, ...catalogsData];
      setCatalogs(allCatalogs);
      
      // Set the active catalog as selected if no specific selection
      if (!selectedCatalogId) {
        const activeCatalog = allCatalogs.find(c => c.active);
        if (activeCatalog && onCatalogChange) {
          onCatalogChange(activeCatalog.id === 'default' ? null : activeCatalog.id);
        }
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load catalogs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCatalogChange = (catalogId: string) => {
    if (onCatalogChange) {
      onCatalogChange(catalogId === 'default' ? null : catalogId);
    }
  };

  const getSelectedCatalog = () => {
    if (selectedCatalogId) {
      return catalogs.find(c => c.id === selectedCatalogId);
    }
    return catalogs.find(c => c.active) || catalogs.find(c => c.is_default);
  };

  const selectedCatalog = getSelectedCatalog();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
        <CircularProgress size={16} sx={{ mr: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Loading catalogs...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ minWidth: 200 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250 }}>
      <FormControl variant={variant} size={size} sx={{ minWidth: 200, flexGrow: 1 }}>
        <InputLabel id="catalog-selector-label">
          Metrics Catalog
        </InputLabel>
        <Select
          labelId="catalog-selector-label"
          value={selectedCatalog?.id || 'default'}
          label="Metrics Catalog"
          onChange={(e) => handleCatalogChange(e.target.value)}
        >
          {catalogs.map((catalog) => (
            <MenuItem key={catalog.id} value={catalog.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">
                    {catalog.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {catalog.items_count} metrics
                    {catalog.owner && ` • ${catalog.owner}`}
                  </Typography>
                </Box>
                {catalog.active && (
                  <Chip
                    size="small"
                    label="Active"
                    color="success"
                    icon={<CheckCircleIcon />}
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title="Refresh catalogs">
        <IconButton
          size="small"
          onClick={() => fetchCatalogs(true)}
          disabled={refreshing}
          sx={{ ml: 1 }}
        >
          {refreshing ? (
            <CircularProgress size={16} />
          ) : (
            <RefreshIcon />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default CatalogSelector;