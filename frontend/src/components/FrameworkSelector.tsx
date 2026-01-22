/**
 * Framework Selector Component
 *
 * A dropdown selector that allows users to switch between frameworks
 * (NIST CSF 2.0, AI RMF 1.0, Cyber AI Profile) in the dashboard header.
 */

import React from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  SelectChangeEvent,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SmartToyIcon from '@mui/icons-material/SmartToy';

import { useFramework, Framework } from '../contexts/FrameworkContext';

// Framework icons mapping
const FRAMEWORK_ICONS: Record<string, React.ReactNode> = {
  csf_2_0: <SecurityIcon fontSize="small" />,
  ai_rmf: <PsychologyIcon fontSize="small" />,
  cyber_ai_profile: <SmartToyIcon fontSize="small" />,
};

// Framework colors
const FRAMEWORK_COLORS: Record<string, string> = {
  csf_2_0: '#1976d2',       // Blue
  ai_rmf: '#9c27b0',        // Purple
  cyber_ai_profile: '#00897b', // Teal
};

interface FrameworkSelectorProps {
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  showDescription?: boolean;
  fullWidth?: boolean;
}

export function FrameworkSelector({
  variant = 'outlined',
  size = 'small',
  showDescription = false,
  fullWidth = false,
}: FrameworkSelectorProps) {
  const {
    selectedFramework,
    frameworks,
    isLoadingFrameworks,
    selectFramework,
  } = useFramework();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedCode = event.target.value;
    const framework = frameworks.find(f => f.code === selectedCode);
    if (framework) {
      selectFramework(framework);
    }
  };

  if (isLoadingFrameworks) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading frameworks...
        </Typography>
      </Box>
    );
  }

  if (frameworks.length === 0) {
    return (
      <Typography variant="body2" color="error">
        No frameworks available
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FormControl
        variant={variant}
        size={size}
        sx={{ minWidth: fullWidth ? '100%' : 220 }}
      >
        <Select
          value={selectedFramework?.code || ''}
          onChange={handleChange}
          displayEmpty
          renderValue={(value) => {
            if (!value) {
              return (
                <Typography color="text.secondary">
                  Select Framework
                </Typography>
              );
            }
            const fw = frameworks.find(f => f.code === value);
            if (!fw) return value;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {FRAMEWORK_ICONS[fw.code] || <SecurityIcon fontSize="small" />}
                <Typography variant="body2">{fw.name}</Typography>
                {fw.version && (
                  <Chip
                    label={fw.version}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.7rem',
                      bgcolor: FRAMEWORK_COLORS[fw.code] || '#666',
                      color: 'white',
                    }}
                  />
                )}
              </Box>
            );
          }}
        >
          {frameworks.filter(f => f.active).map((framework) => (
            <MenuItem key={framework.code} value={framework.code}>
              <Tooltip
                title={framework.description || ''}
                placement="right"
                arrow
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {FRAMEWORK_ICONS[framework.code] || <SecurityIcon fontSize="small" />}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">{framework.name}</Typography>
                    {showDescription && framework.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          maxWidth: 300,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {framework.description}
                      </Typography>
                    )}
                  </Box>
                  {framework.version && (
                    <Chip
                      label={framework.version}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.7rem',
                        bgcolor: FRAMEWORK_COLORS[framework.code] || '#666',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
              </Tooltip>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

// Compact version for the navbar
export function FrameworkSelectorCompact() {
  const { selectedFramework, frameworks, selectFramework } = useFramework();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedCode = event.target.value;
    const framework = frameworks.find(f => f.code === selectedCode);
    if (framework) {
      selectFramework(framework);
    }
  };

  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <Select
        value={selectedFramework?.code || ''}
        onChange={handleChange}
        variant="outlined"
        sx={{
          bgcolor: 'rgba(255,255,255,0.1)',
          color: 'white',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.3)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.5)',
          },
          '& .MuiSvgIcon-root': {
            color: 'white',
          },
        }}
      >
        {frameworks.filter(f => f.active).map((framework) => (
          <MenuItem key={framework.code} value={framework.code}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {FRAMEWORK_ICONS[framework.code]}
              <Typography variant="body2">{framework.name}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default FrameworkSelector;
