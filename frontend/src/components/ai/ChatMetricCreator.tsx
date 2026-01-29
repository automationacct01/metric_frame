import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Send as SendIcon,
  Clear as ClearIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useFramework } from '../../contexts/FrameworkContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedMetric?: SuggestedMetric;
}

interface SuggestedMetric {
  name: string;
  description: string;
  csf_function: string;
  category_code?: string;
  direction: string;
  target_value: number;
  unit: string;
  priority_rank: number;
  owner_function: string;
  data_source?: string;
  collection_frequency: string;
  rationale: string;
}

const EXAMPLE_PROMPTS = [
  "I want to track how quickly our team responds to security incidents",
  "We need a metric for measuring phishing awareness training completion",
  "Help me create a metric for vulnerability patching compliance",
  "I want to measure our MFA adoption rate across the organization",
  "Create a metric for tracking data backup success rates",
];

const ChatMetricCreator: React.FC = () => {
  const { selectedFramework } = useFramework();
  const frameworkCode = selectedFramework?.code || 'csf_2_0';
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<SuggestedMetric | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create metric mutation
  const createMetricMutation = useMutation({
    mutationFn: (metric: any) => apiClient.createMetric(metric),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });

      // Add success message
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Metric created successfully! You can find it in your metrics list.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);
      setEditDialogOpen(false);
      setEditingMetric(null);
    },
    onError: (error: any) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to create metric: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call AI to generate metric suggestion
      const response = await apiClient.chatWithAI({
        message: `Based on this description, suggest a specific security metric I can track: "${inputMessage}".

        Please provide a structured response with:
        1. A clear metric name
        2. A description of what it measures
        3. The best CSF function it maps to (gv, id, pr, de, rs, rc)
        4. Whether higher values are better or lower values are better
        5. A suggested target value and unit
        6. Recommended priority (1=high, 2=medium, 3=low)
        7. Which team should own this metric
        8. Where the data might come from
        9. How often it should be collected
        10. Brief rationale for why this metric is valuable`,
        mode: 'metrics',
        framework: frameworkCode,
      }, frameworkCode);

      // Parse AI response into structured metric (simplified parsing)
      const suggestedMetric = parseAIResponseToMetric(response.assistant_message, inputMessage);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.assistant_message,
        timestamp: new Date(),
        suggestedMetric,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error while processing your request: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseAIResponseToMetric = (response: string, userInput: string): SuggestedMetric => {
    // Basic parsing - in production, the AI would return structured JSON
    // This is a fallback that creates a reasonable metric from the context
    const responseLower = response.toLowerCase();

    // Determine direction
    let direction = 'higher_is_better';
    if (responseLower.includes('lower is better') ||
        responseLower.includes('minimize') ||
        responseLower.includes('reduce')) {
      direction = 'lower_is_better';
    }

    // Determine CSF function
    let csf_function = 'pr'; // Default to Protect
    if (responseLower.includes('govern') || responseLower.includes('policy')) {
      csf_function = 'gv';
    } else if (responseLower.includes('identify') || responseLower.includes('asset') || responseLower.includes('inventory')) {
      csf_function = 'id';
    } else if (responseLower.includes('detect') || responseLower.includes('monitor') || responseLower.includes('alert')) {
      csf_function = 'de';
    } else if (responseLower.includes('respond') || responseLower.includes('incident') || responseLower.includes('mttr')) {
      csf_function = 'rs';
    } else if (responseLower.includes('recover') || responseLower.includes('backup') || responseLower.includes('restore')) {
      csf_function = 'rc';
    }

    // Extract a metric name from the response or generate from input
    let name = userInput.length > 50 ? userInput.substring(0, 50) + '...' : userInput;
    const nameMatch = response.match(/(?:metric[:\s]+)?["']([^"']+)["']/i);
    if (nameMatch) {
      name = nameMatch[1];
    }

    return {
      name: name,
      description: `Metric to track: ${userInput}`,
      csf_function,
      direction,
      target_value: direction === 'higher_is_better' ? 95 : 5,
      unit: '%',
      priority_rank: 2,
      owner_function: 'SecOps',
      collection_frequency: 'monthly',
      rationale: 'AI-suggested metric based on user description',
    };
  };

  const handleCreateMetric = (metric: SuggestedMetric) => {
    setEditingMetric(metric);
    setEditDialogOpen(true);
  };

  const handleConfirmCreate = () => {
    if (!editingMetric) return;

    const metricToCreate = {
      name: editingMetric.name,
      description: editingMetric.description,
      csf_function: editingMetric.csf_function,
      category_code: editingMetric.category_code,
      direction: editingMetric.direction,
      target_value: editingMetric.target_value,
      current_value: 0,
      unit: editingMetric.unit,
      priority_rank: editingMetric.priority_rank,
      owner_function: editingMetric.owner_function,
      data_source: editingMetric.data_source || '',
      collection_frequency: editingMetric.collection_frequency,
      active: true,
      framework_code: frameworkCode,
    };

    createMetricMutation.mutate(metricToCreate);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleExampleClick = (example: string) => {
    setInputMessage(example);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <PsychologyIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Create Metrics with AI
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Describe what you want to measure, and I'll help you create the perfect metric for {selectedFramework?.name || 'your framework'}.
        </Typography>
      </Box>

      {/* Example prompts */}
      {messages.length === 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LightbulbIcon sx={{ mr: 1, fontSize: 18, color: 'warning.main' }} />
            <Typography variant="subtitle2">Try these examples:</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <Chip
                key={index}
                label={prompt}
                size="small"
                variant="outlined"
                onClick={() => handleExampleClick(prompt)}
                sx={{
                  cursor: 'pointer',
                  height: 'auto',
                  '& .MuiChip-label': {
                    whiteSpace: 'normal',
                    py: 0.5,
                  },
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Chat Messages */}
      <Paper
        sx={{
          flexGrow: 1,
          p: 2,
          overflow: 'auto',
          minHeight: 300,
          maxHeight: 500,
          mb: 2,
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1" textAlign="center">
              Describe a security metric you'd like to create
            </Typography>
            <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
              I'll help you define it properly and map it to {selectedFramework?.name || 'your framework'}
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message) => (
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
                    minWidth: 36,
                    height: 36,
                  }}
                >
                  {message.role === 'user' ? <PersonIcon fontSize="small" /> : <BotIcon fontSize="small" />}
                </Box>

                <Box sx={{ maxWidth: '75%' }}>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: message.role === 'user' ? 'primary.light' : 'grey.100',
                      color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Paper>

                  {/* Suggested Metric Card */}
                  {message.suggestedMetric && (
                    <Card sx={{ mt: 2, border: '2px solid', borderColor: 'success.light' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                          <Typography variant="subtitle2">Suggested Metric</Typography>
                        </Box>

                        <Typography variant="h6" gutterBottom>
                          {message.suggestedMetric.name}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" paragraph>
                          {message.suggestedMetric.description}
                        </Typography>

                        <Grid container spacing={1} sx={{ mb: 2 }}>
                          <Grid item>
                            <Chip
                              size="small"
                              label={`Function: ${message.suggestedMetric.csf_function.toUpperCase()}`}
                              variant="outlined"
                            />
                          </Grid>
                          <Grid item>
                            <Chip
                              size="small"
                              label={`Target: ${message.suggestedMetric.target_value}${message.suggestedMetric.unit}`}
                              variant="outlined"
                            />
                          </Grid>
                          <Grid item>
                            <Chip
                              size="small"
                              label={message.suggestedMetric.direction.replace('_', ' ')}
                              variant="outlined"
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleCreateMetric(message.suggestedMetric!)}
                          variant="contained"
                          color="success"
                        >
                          Create This Metric
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleCreateMetric(message.suggestedMetric!)}
                        >
                          Edit & Create
                        </Button>
                      </CardActions>
                    </Card>
                  )}
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Paper>

      {/* Input Area */}
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Describe the metric you want to create..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              size="small"
            />
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                endIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
              >
                Send
              </Button>
              {messages.length > 0 && (
                <Tooltip title="Clear chat">
                  <IconButton onClick={clearChat} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Edit Metric Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Review & Create Metric</DialogTitle>
        <DialogContent>
          {editingMetric && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Metric Name"
                  value={editingMetric.name}
                  onChange={(e) => setEditingMetric(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={editingMetric.description}
                  onChange={(e) => setEditingMetric(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>{frameworkCode === 'ai_rmf' ? 'AI RMF Function' : 'CSF Function'}</InputLabel>
                  <Select
                    value={editingMetric.csf_function}
                    label={frameworkCode === 'ai_rmf' ? 'AI RMF Function' : 'CSF Function'}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, csf_function: e.target.value } : null)}
                  >
                    {frameworkCode === 'ai_rmf' ? (
                      <>
                        <MenuItem value="govern">Govern</MenuItem>
                        <MenuItem value="map">Map</MenuItem>
                        <MenuItem value="measure">Measure</MenuItem>
                        <MenuItem value="manage">Manage</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value="gv">Govern (GV)</MenuItem>
                        <MenuItem value="id">Identify (ID)</MenuItem>
                        <MenuItem value="pr">Protect (PR)</MenuItem>
                        <MenuItem value="de">Detect (DE)</MenuItem>
                        <MenuItem value="rs">Respond (RS)</MenuItem>
                        <MenuItem value="rc">Recover (RC)</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Direction</InputLabel>
                  <Select
                    value={editingMetric.direction}
                    label="Direction"
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, direction: e.target.value } : null)}
                  >
                    <MenuItem value="higher_is_better">Higher is Better</MenuItem>
                    <MenuItem value="lower_is_better">Lower is Better</MenuItem>
                    <MenuItem value="target_range">Target Range</MenuItem>
                    <MenuItem value="binary">Binary</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Target Value"
                  value={editingMetric.target_value}
                  onChange={(e) => setEditingMetric(prev => prev ? { ...prev, target_value: parseFloat(e.target.value) || 0 } : null)}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Unit"
                  value={editingMetric.unit}
                  onChange={(e) => setEditingMetric(prev => prev ? { ...prev, unit: e.target.value } : null)}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={editingMetric.priority_rank}
                    label="Priority"
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, priority_rank: e.target.value as number } : null)}
                  >
                    <MenuItem value={1}>High</MenuItem>
                    <MenuItem value={2}>Medium</MenuItem>
                    <MenuItem value={3}>Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Owner Function</InputLabel>
                  <Select
                    value={editingMetric.owner_function}
                    label="Owner Function"
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, owner_function: e.target.value } : null)}
                  >
                    <MenuItem value="GRC">GRC</MenuItem>
                    <MenuItem value="SecOps">SecOps</MenuItem>
                    <MenuItem value="IAM">IAM</MenuItem>
                    <MenuItem value="IT Ops">IT Ops</MenuItem>
                    <MenuItem value="IR">IR</MenuItem>
                    <MenuItem value="BCP">BCP</MenuItem>
                    <MenuItem value="CISO">CISO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Collection Frequency</InputLabel>
                  <Select
                    value={editingMetric.collection_frequency}
                    label="Collection Frequency"
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, collection_frequency: e.target.value } : null)}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="ad_hoc">Ad Hoc</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Data Source (optional)"
                  value={editingMetric.data_source || ''}
                  onChange={(e) => setEditingMetric(prev => prev ? { ...prev, data_source: e.target.value } : null)}
                  placeholder="e.g., SIEM, Vulnerability Scanner, EDR"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmCreate}
            disabled={createMetricMutation.isPending || !editingMetric?.name}
            startIcon={createMetricMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Create Metric
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatMetricCreator;
