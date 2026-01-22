import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/icons-material';
import { apiClient } from '../api/client';
import { ContentFrame } from './layout';
import { AIChatRequest, AIAction } from '../types';
import { useFramework } from '../contexts/FrameworkContext';
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
}

export default function AIChat() {
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';

  const [state, setState] = useState<AIChatState>({
    messages: [],
    currentMessage: '',
    mode: 'metrics',
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
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
        <Chip
          icon={<BotIcon />}
          label="Chat"
          color={state.activeView === 'chat' ? 'primary' : 'default'}
          variant={state.activeView === 'chat' ? 'filled' : 'outlined'}
          onClick={() => setActiveView('chat')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<AIIcon />}
          label="Recommendations"
          color={state.activeView === 'recommendations' ? 'primary' : 'default'}
          variant={state.activeView === 'recommendations' ? 'filled' : 'outlined'}
          onClick={() => setActiveView('recommendations')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<SendIcon />}
          label="Create Metric"
          color={state.activeView === 'create' ? 'primary' : 'default'}
          variant={state.activeView === 'create' ? 'filled' : 'outlined'}
          onClick={() => setActiveView('create')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<HistoryIcon />}
          label="Gap Analysis"
          color={state.activeView === 'gaps' ? 'primary' : 'default'}
          variant={state.activeView === 'gaps' ? 'filled' : 'outlined'}
          onClick={() => setActiveView('gaps')}
          sx={{ cursor: 'pointer' }}
        />
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
                        {state.aiStatus?.ai_service_available
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
                      <MenuItem value="metrics">Metrics Management</MenuItem>
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
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  {message.actions && message.actions.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        Actions: {message.actions.length}
                      </Typography>
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
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
            <Box display="flex" gap={1}>
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
        <DialogTitle>Confirm AI Actions</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            The AI wants to perform the following actions:
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
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please review these actions carefully before confirming.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setState(prev => ({ ...prev, actionDialogOpen: false, pendingActions: [] }))}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleApplyActions(state.pendingActions, true)}
            variant="contained"
            color="primary"
            startIcon={<CheckIcon />}
          >
            Confirm & Apply
          </Button>
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