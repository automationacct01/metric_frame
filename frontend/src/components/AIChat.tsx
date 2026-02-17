import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Clear as ClearIcon,
  AutoAwesome as AIIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  PictureAsPdf as PdfIcon,
  TravelExplore as TravelExploreIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';
import { ContentFrame } from './layout';
import { AIChatRequest, AIAction } from '../types';
import { useFramework } from '../contexts/FrameworkContext';
import { useAuth } from '../contexts/AuthContext';
import { FrameworkSelector } from './FrameworkSelector';
import MetricRecommendations from './ai/MetricRecommendations';
import ChatMetricCreator from './ai/ChatMetricCreator';
import GapAnalysisChart from './ai/GapAnalysisChart';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  needsConfirmation?: boolean;
  searchUsed?: boolean;
}

type AIView = 'chat' | 'recommendations' | 'create' | 'gaps';

interface AIChatState {
  messages: ChatMessage[];
  currentMessage: string;
  mode: 'metrics' | 'explain' | 'report';
  loading: boolean;
  error: string | null;
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: 'success' | 'error' | 'warning' | 'info';
  pendingActions: AIAction[];
  actionDialogOpen: boolean;
  historyDialogOpen: boolean;
  aiHistory: any[];
  aiStatus: any;
  activeView: AIView;
  webSearchEnabled: boolean;
}

export default function AIChat() {
  const { selectedFramework } = useFramework();
  const { isEditor } = useAuth();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  // Viewers can only use read-only modes (explain, report)
  // Editors/Admins can use all modes including metrics
  const defaultMode = isEditor ? 'metrics' : 'explain';

  const [state, setState] = useState<AIChatState>({
    messages: [],
    currentMessage: '',
    mode: defaultMode as 'metrics' | 'explain' | 'report',
    loading: false,
    error: null,
    snackbarOpen: false,
    snackbarMessage: '',
    snackbarSeverity: 'info',
    pendingActions: [],
    actionDialogOpen: false,
    historyDialogOpen: false,
    aiHistory: [],
    aiStatus: null,
    activeView: 'chat',
    webSearchEnabled: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());

  const exportToPdf = async (messageId: string) => {
    const element = reportRefs.current[messageId];
    if (!element) return;

    setExportingPdf(messageId);
    try {
      // Create a temporary container for better PDF rendering
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        background: white;
        font-family: Arial, sans-serif;
      `;
      tempContainer.innerHTML = element.innerHTML;
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 190;
      const pageHeight = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`cybersecurity-report-${timestamp}.pdf`);
      showSnackbar('Report exported to PDF successfully!', 'success');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      showSnackbar('Failed to export PDF', 'error');
    } finally {
      setExportingPdf(null);
    }
  };

  const showSnackbar = (message: string, severity: typeof state.snackbarSeverity = 'info') => {
    setState(prev => ({
      ...prev,
      snackbarMessage: message,
      snackbarSeverity: severity,
      snackbarOpen: true,
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  useEffect(() => {
    checkAIStatus();
  }, []);

  // Auto-generate report when switching to report mode
  const generateReport = async () => {
    if (state.loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Generate a report',
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      loading: true,
      error: null,
    }));

    try {
      const request: AIChatRequest = {
        message: 'Generate a comprehensive executive report on our current cybersecurity posture, including risk scores, key findings, and recommendations.',
        mode: 'report',
        framework: frameworkCode,
        context_opts: {},
      };

      const response = await apiClient.chatWithAI(request, frameworkCode);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.assistant_message,
        timestamp: new Date(),
        actions: response.actions,
        needsConfirmation: response.needs_confirmation,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        loading: false,
      }));
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to generate report',
      }));
    }
  };

  // Trigger report generation when switching to report mode
  useEffect(() => {
    if (state.mode === 'report' && state.messages.length === 0 && !state.loading) {
      generateReport();
    }
  }, [state.mode]);

  const checkAIStatus = async () => {
    try {
      const status = await apiClient.getAIStatus();
      setState(prev => ({ ...prev, aiStatus: status }));
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const loadAIHistory = async () => {
    try {
      const history = await apiClient.getAIHistory(50, 0);
      setState(prev => ({ ...prev, aiHistory: history, historyDialogOpen: true }));
    } catch (error) {
      console.error('Failed to load AI history:', error);
      showSnackbar('Failed to load AI history', 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!state.currentMessage.trim() || state.loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: state.currentMessage,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentMessage: '',
      loading: true,
      error: null,
    }));

    try {
      const request: AIChatRequest = {
        message: state.currentMessage,
        mode: state.mode,
        framework: frameworkCode,
        context_opts: {
          conversation_history: state.messages.slice(-5), // Last 5 messages for context
        },
        web_search: state.webSearchEnabled && (state.mode === 'explain' || state.mode === 'report'),
      };

      const response = await apiClient.chatWithAI(request, frameworkCode);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.assistant_message,
        timestamp: new Date(),
        actions: response.actions,
        needsConfirmation: response.needs_confirmation,
        searchUsed: response.search_used,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        loading: false,
        pendingActions: response.needs_confirmation ? response.actions : [],
        actionDialogOpen: response.needs_confirmation && response.actions.length > 0,
      }));

      if (!response.needs_confirmation && response.actions.length > 0) {
        await handleApplyActions(response.actions);
      }
    } catch (error) {
      console.error('Failed to send message to AI:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to communicate with AI. Please try again.',
      }));
    }
  };

  const handleApplyActions = async (actions: AIAction[], userConfirmation = false) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      await apiClient.applyAIActions(actions, userConfirmation);
      
      showSnackbar(`Applied ${actions.length} AI actions successfully`, 'success');
      
      // Add confirmation message to chat
      const confirmationMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ Successfully applied ${actions.length} action(s): ${actions.map(a => a.action).join(', ')}`,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, confirmationMessage],
        loading: false,
        actionDialogOpen: false,
        pendingActions: [],
      }));
    } catch (error) {
      console.error('Failed to apply AI actions:', error);
      showSnackbar('Failed to apply AI actions', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setState(prev => ({ ...prev, messages: [] }));
  };

  const formatActionDescription = (action: AIAction): string => {
    switch (action.action) {
      case 'add_metric':
        return `Add new metric: ${action.metric?.name || 'Unnamed metric'}`;
      case 'update_metric':
        return `Update metric: ${action.changes ? Object.keys(action.changes).join(', ') : 'various fields'}`;
      case 'delete_metric':
        return `Delete metric with ID: ${action.metric_id}`;
      default:
        return `Perform action: ${action.action}`;
    }
  };

  const getModeDescription = (mode: string): string => {
    switch (mode) {
      case 'metrics':
        return 'Manage metrics, create new ones, and update existing data';
      case 'explain':
        return 'Get explanations about risk scores, metrics, and cybersecurity concepts';
      case 'report':
        return 'Generate executive reports and analysis summaries';
      default:
        return 'AI assistance mode';
    }
  };

  const getModeColor = (mode: string): 'primary' | 'secondary' | 'success' => {
    switch (mode) {
      case 'metrics':
        return 'primary';
      case 'explain':
        return 'secondary';
      case 'report':
        return 'success';
      default:
        return 'primary';
    }
  };

  const setActiveView = (view: AIView) => {
    setState(prev => ({ ...prev, activeView: view }));
  };

  return (
    <ContentFrame>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          AI Assistant
        </Typography>
        <FrameworkSelector size="small" />
      </Box>

      {/* View Tabs */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Button
          variant={state.activeView === 'chat' ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<BotIcon />}
          onClick={() => setActiveView('chat')}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: state.activeView === 'chat' ? 3 : 0,
            borderWidth: 2,
            '&:hover': {
              boxShadow: 4,
              borderWidth: 2,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Chat
        </Button>
        <Button
          variant={state.activeView === 'recommendations' ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<AIIcon />}
          onClick={() => setActiveView('recommendations')}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: state.activeView === 'recommendations' ? 3 : 0,
            borderWidth: 2,
            '&:hover': {
              boxShadow: 4,
              borderWidth: 2,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Recommendations
        </Button>
        {/* Create Metric tab - only visible to editors/admins */}
        {isEditor && (
          <Button
            variant={state.activeView === 'create' ? 'contained' : 'outlined'}
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => setActiveView('create')}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: state.activeView === 'create' ? 3 : 0,
              borderWidth: 2,
              '&:hover': {
                boxShadow: 4,
                borderWidth: 2,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Create Metric
          </Button>
        )}
        <Button
          variant={state.activeView === 'gaps' ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<HistoryIcon />}
          onClick={() => setActiveView('gaps')}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: state.activeView === 'gaps' ? 3 : 0,
            borderWidth: 2,
            '&:hover': {
              boxShadow: 4,
              borderWidth: 2,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Gap Analysis
        </Button>
        {/* View Only indicator for viewers */}
        {!isEditor && (
          <Chip
            label="View Only"
            size="small"
            color="default"
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        )}
      </Box>

      {/* Recommendations View */}
      {state.activeView === 'recommendations' && (
        <MetricRecommendations />
      )}

      {/* Create Metric View */}
      {state.activeView === 'create' && (
        <ChatMetricCreator />
      )}

      {/* Gap Analysis View */}
      {state.activeView === 'gaps' && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Framework Coverage Gap Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Visual analysis of your metric coverage across {selectedFramework?.name || 'framework'} functions
          </Typography>
          <GapAnalysisChart showRadar showBar height={350} />
        </Box>
      )}

      {/* Chat View */}
      {state.activeView === 'chat' && (
        <>
          {/* AI Status and Mode Selection */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <BotIcon color="primary" />
                    <Box flex={1}>
                      <Typography variant="h6">
                        AI Assistant Status
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {state.aiStatus?.available
                          ? '🟢 AI Service Available'
                          : '🔴 AI Service Unavailable'}
                        {selectedFramework && (
                          <> | Framework: <strong>{selectedFramework.name}</strong></>
                        )}
                      </Typography>
                    </Box>
                    <Tooltip title="View AI History">
                      <IconButton onClick={loadAIHistory}>
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <FormControl fullWidth>
                    <InputLabel>AI Mode</InputLabel>
                    <Select
                      value={state.mode}
                      label="AI Mode"
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        mode: e.target.value as 'metrics' | 'explain' | 'report'
                      }))}
                    >
                      {/* Metrics mode only available to editors/admins */}
                      {isEditor && <MenuItem value="metrics">Metrics Management</MenuItem>}
                      <MenuItem value="explain">Explanations</MenuItem>
                      <MenuItem value="report">Report Generation</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    {getModeDescription(state.mode)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Current Mode Indicator */}
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={<AIIcon />}
              label={`Mode: ${state.mode.charAt(0).toUpperCase() + state.mode.slice(1)}`}
              color={getModeColor(state.mode)}
              variant="filled"
            />
          </Box>

      {/* Chat Messages */}
      <Paper sx={{ height: 500, mb: 2, p: 2, overflow: 'auto' }}>
        {state.messages.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100%"
            color="textSecondary"
          >
            <AIIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Welcome to the AI Assistant
            </Typography>
            <Typography variant="body2" textAlign="center">
              Ask questions about your metrics, request explanations, or generate reports.
              <br />
              Current mode: <strong>{state.mode}</strong>
            </Typography>
          </Box>
        ) : (
          <>
            {state.messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  mb: 2,
                  alignItems: 'flex-start',
                }}
              >
                <Box
                  sx={{
                    mx: 1,
                    p: 1,
                    borderRadius: '50%',
                    backgroundColor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 40,
                    height: 40,
                  }}
                >
                  {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                </Box>
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    backgroundColor: message.role === 'user' ? 'primary.light' : 'grey.100',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {message.role === 'assistant' ? (
                    <Box
                      ref={(el: HTMLDivElement | null) => { reportRefs.current[message.id] = el; }}
                      sx={{
                        '& h1': { fontSize: '1.5rem', fontWeight: 600, mt: 0, mb: 1 },
                        '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 2, mb: 1 },
                        '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1.5, mb: 0.5 },
                        '& p': { my: 1 },
                        '& ul, & ol': { pl: 2, my: 1 },
                        '& li': { mb: 0.5 },
                        '& strong': { fontWeight: 600 },
                        '& code': {
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          px: 0.5,
                          borderRadius: 0.5,
                          fontFamily: 'monospace',
                        },
                        '& pre': {
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          p: 1,
                          borderRadius: 1,
                          overflow: 'auto',
                        },
                      }}
                    >
                      <ReactMarkdown>
                        {message.actions && message.actions.length > 0
                          ? message.content.replace(/```json\s*[\s\S]*?```/g, '').trim()
                          : message.content}
                      </ReactMarkdown>
                    </Box>
                  ) : (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                  )}
                  {message.actions && message.actions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      {message.actions.filter(a => a.action === 'add_metric' && a.metric).map((action, idx) => {
                        const actionKey = `${message.id}-${idx}`;
                        const isApplied = appliedActions.has(actionKey);
                        return (
                          <Card key={idx} sx={{ mt: 1, border: '2px solid', borderColor: isApplied ? 'grey.400' : 'success.light', bgcolor: isApplied ? 'action.hover' : undefined }}>
                            <CardContent sx={{ pb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CheckIcon sx={{ mr: 1, color: isApplied ? 'grey.500' : 'success.main', fontSize: 20 }} />
                                <Typography variant="subtitle2" color="text.secondary">
                                  {isApplied ? 'Metric Created' : 'Suggested Metric'}
                                </Typography>
                              </Box>
                              <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
                                {action.metric?.name || 'Unnamed Metric'}
                              </Typography>
                              {action.metric?.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                  {action.metric.description}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {action.metric?.csf_function && (
                                  <Chip size="small" label={`Function: ${action.metric.csf_function.toUpperCase()}`} variant="outlined" />
                                )}
                                {action.metric?.target_value != null && (
                                  <Chip size="small" label={`Target: ${action.metric.target_value}${action.metric?.target_units || '%'}`} variant="outlined" />
                                )}
                                {action.metric?.direction && (
                                  <Chip size="small" label={action.metric.direction.replace(/_/g, ' ')} variant="outlined" />
                                )}
                                {action.metric?.priority_rank != null && (
                                  <Chip
                                    size="small"
                                    label={`Priority: ${action.metric.priority_rank === 1 ? 'High' : action.metric.priority_rank === 2 ? 'Medium' : 'Low'}`}
                                    variant="outlined"
                                    color={action.metric.priority_rank === 1 ? 'error' : action.metric.priority_rank === 2 ? 'warning' : 'default'}
                                  />
                                )}
                              </Box>
                            </CardContent>
                            {isEditor && !isApplied && (
                              <CardActions sx={{ pt: 0 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckIcon />}
                                  disabled={state.loading}
                                  onClick={async () => {
                                    await handleApplyActions([action], true);
                                    setAppliedActions(prev => new Set(prev).add(actionKey));
                                  }}
                                >
                                  Apply
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => setAppliedActions(prev => new Set(prev).add(actionKey))}
                                >
                                  Dismiss
                                </Button>
                              </CardActions>
                            )}
                          </Card>
                        );
                      })}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                      {message.searchUsed && (
                        <Chip
                          icon={<TravelExploreIcon sx={{ fontSize: 14 }} />}
                          label="Web Search"
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.7rem', px: 0.5 } }}
                        />
                      )}
                    </Box>
                    {message.role === 'assistant' && state.mode === 'report' && (
                      <Tooltip title="Export as PDF">
                        <IconButton
                          size="small"
                          onClick={() => exportToPdf(message.id)}
                          disabled={exportingPdf === message.id}
                          sx={{ ml: 1 }}
                        >
                          {exportingPdf === message.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <PdfIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Paper>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Export PDF Button - Show when in report mode with messages */}
      {state.mode === 'report' && state.messages.some(m => m.role === 'assistant') && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            color: 'white',
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <PdfIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Export Report as PDF
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Download your cybersecurity executive report
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                const lastAssistantMessage = [...state.messages].reverse().find(m => m.role === 'assistant');
                if (lastAssistantMessage) {
                  exportToPdf(lastAssistantMessage.id);
                }
              }}
              disabled={exportingPdf !== null}
              sx={{
                backgroundColor: 'white',
                color: '#1976d2',
                fontWeight: 'bold',
                px: 4,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                },
              }}
              startIcon={exportingPdf ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
            >
              {exportingPdf ? 'Exporting...' : 'Download PDF'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Message Input */}
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={`Ask the AI assistant about ${state.mode}...`}
              value={state.currentMessage}
              onChange={(e) => setState(prev => ({ ...prev, currentMessage: e.target.value }))}
              onKeyPress={handleKeyPress}
              disabled={state.loading}
            />
          </Grid>
          <Grid item>
            <Box display="flex" gap={1} alignItems="center">
              {(state.mode === 'explain' || state.mode === 'report') && (
                <Tooltip title={state.webSearchEnabled ? 'Web search ON — AI will search the web for current info' : 'Enable web search for additional context'}>
                  <IconButton
                    onClick={() => setState(prev => ({ ...prev, webSearchEnabled: !prev.webSearchEnabled }))}
                    color={state.webSearchEnabled ? 'primary' : 'default'}
                    size="small"
                    sx={{
                      border: state.webSearchEnabled ? '1px solid' : '1px solid transparent',
                      borderColor: state.webSearchEnabled ? 'primary.main' : 'transparent',
                      bgcolor: state.webSearchEnabled ? 'primary.50' : 'transparent',
                    }}
                  >
                    <TravelExploreIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Button
                variant="contained"
                endIcon={state.loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={handleSendMessage}
                disabled={state.loading || !state.currentMessage.trim()}
              >
                Send
              </Button>
              <IconButton onClick={clearChat} title="Clear chat">
                <ClearIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>
        </>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog
        open={state.actionDialogOpen}
        onClose={() => setState(prev => ({ ...prev, actionDialogOpen: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditor ? 'Confirm AI Actions' : 'AI Suggested Actions'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {isEditor
              ? 'The AI wants to perform the following actions:'
              : 'The AI suggested the following actions (view only):'}
          </Typography>
          <List>
            {state.pendingActions.map((action, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={formatActionDescription(action)}
                  secondary={`Action type: ${action.action}`}
                />
              </ListItem>
            ))}
          </List>
          {isEditor ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please review these actions carefully before confirming.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              These actions require Editor or Admin permissions to apply.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setState(prev => ({ ...prev, actionDialogOpen: false, pendingActions: [] }))}
            startIcon={<CancelIcon />}
          >
            {isEditor ? 'Cancel' : 'Close'}
          </Button>
          {isEditor && (
            <Button
              onClick={() => handleApplyActions(state.pendingActions, true)}
              variant="contained"
              color="primary"
              startIcon={<CheckIcon />}
            >
              Confirm & Apply
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* AI History Dialog */}
      <Dialog
        open={state.historyDialogOpen}
        onClose={() => setState(prev => ({ ...prev, historyDialogOpen: false }))}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>AI Action History</DialogTitle>
        <DialogContent>
          {state.aiHistory.length === 0 ? (
            <Typography>No AI history available.</Typography>
          ) : (
            <List>
              {state.aiHistory.map((item, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={`${item.action_type}: ${item.summary || 'No summary'}`}
                      secondary={`Applied: ${item.applied_at || 'Not applied'} | Status: ${item.status || 'Unknown'}`}
                    />
                  </ListItem>
                  {index < state.aiHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, historyDialogOpen: false }))}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={state.snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setState(prev => ({ ...prev, snackbarOpen: false }))}
      >
        <Alert
          severity={state.snackbarSeverity}
          onClose={() => setState(prev => ({ ...prev, snackbarOpen: false }))}
        >
          {state.snackbarMessage}
        </Alert>
      </Snackbar>
    </ContentFrame>
  );
}