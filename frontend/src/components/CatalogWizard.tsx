import React, { useState } from 'react';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Container,
  useTheme,
  alpha,
} from '@mui/material';
import { ContentFrame } from './layout';
import { apiClient } from '../api/client';
import { parseCSVFile, ParsedCSVData } from '../utils/csvParser';
import { useFramework } from '../contexts/FrameworkContext';

// Step components
import FileUploadStep from './catalog/FileUploadStep';
import FieldMappingStep from './catalog/FieldMappingStep';
import CSFMappingStep from './catalog/CSFMappingStep';
import MetricEnhancementStep from './catalog/MetricEnhancementStep';
import ConfirmActivateStep from './catalog/ConfirmActivateStep';

const steps = [
  'Upload File',
  'Map Fields', 
  'Map to CSF',
  'Enhance Metrics',
  'Confirm & Activate'
];

interface CatalogWizardState {
  // Upload step
  uploadedFile: File | null;
  catalogName: string;
  description: string;
  catalogId: string | null;
  uploadErrors: string[];
  itemsImported: number;
  
  // Field mapping step
  parsedData: ParsedCSVData | null;
  fieldMappings: Record<string, string>;
  
  // CSF mapping step
  suggestedMappings: any[];
  confirmedMappings: any[];
  
  // Enhancement step
  enhancedMetrics: any[];
  acceptedEnhancements: any[];
  enhancementAttempted: boolean;
  
  // Final step
  isActivating: boolean;
  activationComplete: boolean;
}

const CatalogWizard: React.FC = () => {
  const theme = useTheme();
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wizardState, setWizardState] = useState<CatalogWizardState>({
    uploadedFile: null,
    catalogName: '',
    description: '',
    catalogId: null,
    uploadErrors: [],
    itemsImported: 0,
    parsedData: null,
    fieldMappings: {},
    suggestedMappings: [],
    confirmedMappings: [],
    enhancedMetrics: [],
    acceptedEnhancements: [],
    enhancementAttempted: false,
    isActivating: false,
    activationComplete: false,
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setWizardState({
      uploadedFile: null,
      catalogName: '',
      description: '',
      catalogId: null,
      uploadErrors: [],
      itemsImported: 0,
      parsedData: null,
      fieldMappings: {},
      suggestedMappings: [],
      confirmedMappings: [],
      enhancedMetrics: [],
      acceptedEnhancements: [],
      enhancementAttempted: false,
      isActivating: false,
      activationComplete: false,
    });
    setError(null);
  };

  const updateWizardState = (updates: Partial<CatalogWizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  const handleStepValidation = async (step: number): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      switch (step) {
        case 0: // Upload step
          if (!wizardState.uploadedFile || !wizardState.catalogName.trim()) {
            setError('Please select a file and provide a catalog name');
            return false;
          }
          
          // Parse CSV file to extract column headers
          let parsedData: ParsedCSVData | null = null;
          if (wizardState.uploadedFile.name.toLowerCase().endsWith('.csv')) {
            try {
              parsedData = await parseCSVFile(wizardState.uploadedFile);
            } catch (err: any) {
              setError(`Failed to parse CSV file: ${err.message}`);
              return false;
            }
          }
          
          // Upload file and parse
          const uploadResult = await apiClient.uploadCatalog(
            wizardState.uploadedFile,
            wizardState.catalogName,
            wizardState.description,
            'admin', // TODO: Get from user context
            frameworkCode
          );
          
          updateWizardState({
            catalogId: uploadResult.catalog_id,
            uploadErrors: uploadResult.import_errors || [],
            suggestedMappings: uploadResult.suggested_mappings || [],
            parsedData: parsedData,
            itemsImported: uploadResult.items_imported,
          });
          
          return true;

        case 1: // Field mapping step
          // Validation for field mappings
          const requiredFields = ['name', 'direction'];
          for (const field of requiredFields) {
            if (!wizardState.fieldMappings[field]) {
              setError(`Please map the required field: ${field}`);
              return false;
            }
          }
          return true;

        case 2: // CSF mapping step
          if (wizardState.confirmedMappings.length === 0) {
            setError('Please confirm at least one CSF mapping. You can use the "Create Manual Mapping" button if AI suggestions are not available.');
            return false;
          }
          
          // Save CSF mappings
          if (wizardState.catalogId) {
            await apiClient.saveCatalogMappings(
              wizardState.catalogId,
              wizardState.confirmedMappings
            );
          }
          
          return true;

        case 3: // Enhancement step
          // Enhancement is optional - allow proceeding even without enhancements
          // But if enhancements were generated, require at least some to be accepted
          if (wizardState.enhancedMetrics.length > 0 && wizardState.acceptedEnhancements.length === 0) {
            setError('Please accept at least one metric enhancement or proceed without enhancements.');
            return false;
          }
          return true;

        case 4: // Activation step
          if (wizardState.catalogId) {
            updateWizardState({ isActivating: true });
            await apiClient.activateCatalog(wizardState.catalogId, true);
            updateWizardState({ 
              isActivating: false, 
              activationComplete: true 
            });
          }
          return true;

        default:
          return true;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <FileUploadStep
            state={wizardState}
            updateState={updateWizardState}
            error={error}
          />
        );
      case 1:
        return (
          <FieldMappingStep
            state={wizardState}
            updateState={updateWizardState}
            error={error}
          />
        );
      case 2:
        return (
          <CSFMappingStep
            state={wizardState}
            updateState={updateWizardState}
            error={error}
            frameworkCode={frameworkCode}
          />
        );
      case 3:
        return (
          <MetricEnhancementStep
            state={wizardState}
            updateState={updateWizardState}
            error={error}
            frameworkCode={frameworkCode}
          />
        );
      case 4:
        return (
          <ConfirmActivateStep
            state={wizardState}
            updateState={updateWizardState}
            error={error}
          />
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  const isStepOptional = (step: number) => {
    return step === 1; // Field mapping can be skipped for well-formatted files
  };

  const isStepCompleted = (step: number) => {
    switch (step) {
      case 0:
        return Boolean(wizardState.catalogId);
      case 1:
        return Object.keys(wizardState.fieldMappings).length > 0;
      case 2:
        return wizardState.confirmedMappings.length > 0;
      case 3:
        return (activeStep > 3) && (
          wizardState.acceptedEnhancements.length > 0 || 
          (wizardState.enhancementAttempted && wizardState.enhancedMetrics.length === 0)
        );
      case 4:
        return wizardState.activationComplete;
      default:
        return false;
    }
  };

  return (
    <ContentFrame
      title="Bring Your Own Catalog"
      subtitle={`Import your custom cybersecurity metrics and map them to ${selectedFramework?.name || 'NIST CSF 2.0'}`}
    >
      <Container maxWidth="lg">
        <Paper 
          elevation={2} 
          sx={{ 
            p: 4, 
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(8px)',
          }}
        >
          <Stepper 
            activeStep={activeStep} 
            sx={{ mb: 4 }}
            alternativeLabel
          >
            {steps.map((label, index) => {
              const stepProps: { completed?: boolean } = {};
              const labelProps: { optional?: React.ReactNode } = {};
              
              if (isStepOptional(index)) {
                labelProps.optional = (
                  <Typography variant="caption">Optional</Typography>
                );
              }
              
              if (isStepCompleted(index)) {
                stepProps.completed = true;
              }

              return (
                <Step key={label} {...stepProps}>
                  <StepLabel {...labelProps}>{label}</StepLabel>
                </Step>
              );
            })}
          </Stepper>

          {activeStep === steps.length ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <AlertTitle>Catalog Successfully Activated!</AlertTitle>
                Your custom metrics catalog has been imported and activated. 
                The dashboard will now use your metrics for scoring.
              </Alert>
              
              <Button 
                onClick={handleReset}
                variant="outlined"
                sx={{ mr: 2 }}
              >
                Import Another Catalog
              </Button>
              
              <Button 
                variant="contained"
                href="/dashboard"
              >
                View Dashboard
              </Button>
            </Box>
          ) : (
            <Box>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <AlertTitle>Error</AlertTitle>
                  {error}
                </Alert>
              )}

              <Box sx={{ minHeight: 400, mb: 3 }}>
                {getStepContent(activeStep)}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                <Button
                  color="inherit"
                  disabled={activeStep === 0 || loading}
                  onClick={handleBack}
                  sx={{ mr: 1 }}
                >
                  Back
                </Button>
                
                <Box sx={{ flex: '1 1 auto' }} />
                
                {isStepOptional(activeStep) && (
                  <Button 
                    color="inherit" 
                    onClick={handleNext} 
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Skip
                  </Button>
                )}
                
                <Button
                  onClick={async () => {
                    const isValid = await handleStepValidation(activeStep);
                    if (isValid) {
                      handleNext();
                    }
                  }}
                  disabled={loading}
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : undefined}
                >
                  {loading 
                    ? 'Processing...' 
                    : activeStep === steps.length - 1 
                      ? 'Activate Catalog' 
                      : 'Next'
                  }
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </ContentFrame>
  );
};

export default CatalogWizard;