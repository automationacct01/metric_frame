import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Folder as FolderIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material';

interface ConfirmActivateStepProps {
  state: any;
  updateState: (updates: any) => void;
  error: string | null;
}

const ConfirmActivateStep: React.FC<ConfirmActivateStepProps> = ({ state }) => {
  // Mock catalog summary data
  const catalogSummary = {
    name: state.catalogName || 'Custom Metrics Catalog',
    description: state.description || 'Imported cybersecurity metrics',
    totalMetrics: 25,
    mappedMetrics: state.confirmedMappings?.length || 0,
    functionDistribution: {
      gv: 4,
      id: 6,
      pr: 8,
      de: 3,
      rs: 2,
      rc: 2,
    },
  };

  const functionNames = {
    gv: 'Govern',
    id: 'Identify',
    pr: 'Protect',
    de: 'Detect',
    rs: 'Respond',
    rc: 'Recover',
  };

  const activationSteps = [
    { label: 'Deactivate current catalog', completed: !state.isActivating },
    { label: 'Apply new metric mappings', completed: !state.isActivating },
    { label: 'Recalculate scores', completed: !state.isActivating },
    { label: 'Update dashboard', completed: state.activationComplete },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Confirm & Activate Catalog
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Review your catalog configuration and activate it to start using your custom metrics 
        for cybersecurity risk scoring and dashboard display.
      </Typography>

      {state.isActivating && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Activating Catalog...</AlertTitle>
          <Box sx={{ mt: 2 }}>
            {activationSteps.map((step, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon 
                  color={step.completed ? 'success' : 'disabled'} 
                  sx={{ mr: 1 }}
                />
                <Typography 
                  variant="body2" 
                  color={step.completed ? 'text.primary' : 'text.secondary'}
                >
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Box>
          <LinearProgress sx={{ mt: 2 }} />
        </Alert>
      )}

      {state.activationComplete && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Catalog Activated Successfully!</AlertTitle>
          Your custom metrics catalog is now active and being used for scoring calculations.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Catalog Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FolderIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Catalog Overview</Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Catalog Name"
                    secondary={catalogSummary.name}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AssessmentIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Metrics"
                    secondary={`${catalogSummary.totalMetrics} metrics imported`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="CSF Mappings"
                    secondary={`${catalogSummary.mappedMetrics} metrics mapped to NIST CSF 2.0`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <TimelineIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Coverage"
                    secondary={`${((catalogSummary.mappedMetrics / catalogSummary.totalMetrics) * 100).toFixed(1)}% of metrics have CSF mappings`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Function Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InsightsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">CSF Function Distribution</Typography>
              </Box>
              
              <Box sx={{ space: 1 }}>
                {Object.entries(catalogSummary.functionDistribution).map(([code, count]) => (
                  <Box key={code} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        label={code.toUpperCase()}
                        size="small"
                        sx={{ mr: 1, minWidth: 40 }}
                      />
                      <Typography variant="body2">
                        {functionNames[code as keyof typeof functionNames]}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {count} metrics
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Impact Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                What Happens When You Activate
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <AssessmentIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Dashboard Updates
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your dashboard will show scores calculated from your custom metrics instead of the default catalog.
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <TimelineIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Risk Scoring
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All risk calculations will use your metrics with their CSF mappings and target values.
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <InsightsIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      AI Integration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The AI assistant will understand and work with your custom metrics for analysis and recommendations.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Important Notes */}
      <Alert severity="warning">
        <AlertTitle>Important Notes</AlertTitle>
        <List dense>
          <ListItem>
            <ListItemText primary="• Activating this catalog will deactivate any currently active catalog" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• You can switch between catalogs or return to the default metrics at any time" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Historical data and trends will be recalculated based on your new metrics" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Only metrics with CSF mappings will be included in function scores" />
          </ListItem>
        </List>
      </Alert>
    </Box>
  );
};

export default ConfirmActivateStep;