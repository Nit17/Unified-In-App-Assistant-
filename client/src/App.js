import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Chip,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Assignment as TicketIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [tickets, setTickets] = useState([]);
  const [actionResults, setActionResults] = useState([]);
  const [sessionId] = useState(() => localStorage.getItem('sessionId') || generateSessionId());
  const [isLoading, setIsLoading] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(() => {
    const saved = localStorage.getItem('useLLM');
    return saved ? saved === 'true' : false;
  });
  const [llmHealth, setLlmHealth] = useState({ enabled: false, healthy: false, provider: 'ollama' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('sessionId', sessionId);
    loadConversationHistory();
    loadTickets();
    fetchLlmHealth();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    try {
      const response = await axios.get(`/api/conversations/${sessionId}`);
      setMessages(response.data.messages || []);
      setActionResults(response.data.actions || []);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const fetchLlmHealth = async () => {
    try {
      const res = await axios.get('/api/llm/health');
      setLlmHealth(res.data);
    } catch (e) {
      setLlmHealth({ enabled: false, healthy: false, provider: 'unknown' });
    }
  };

  const loadTickets = async () => {
    try {
      const response = await axios.get(`/api/tickets?sessionId=${sessionId}`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        message: inputValue,
        sessionId: sessionId,
        useLLM: llmEnabled,
        context: {
          messages: messages.slice(-5), // Send last 5 messages for context
          tickets: tickets,
          actions: actionResults
        }
      });

      const assistantMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        actions: response.data.actions,
        ticket: response.data.ticket
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.data.actions) {
        setActionResults(prev => [...prev, ...response.data.actions]);
      }

      if (response.data.ticket) {
        setTickets(prev => [...prev, response.data.ticket]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const downloadReport = async (reportId) => {
    try {
      const response = await axios.get(`/api/reports/${reportId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const refreshTickets = () => {
    loadTickets();
    fetchLlmHealth();
  };

  const formatTimestamp = (timestamp) => {
    return moment(timestamp).format('MMM DD, HH:mm');
  };

  const renderMessage = (message) => (
    <ListItem
      key={message.id}
      sx={{
        flexDirection: 'column',
        alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
        mb: 2
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          maxWidth: '80%',
          flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
        }}
      >
        <Box sx={{ mx: 1, mt: 0.5 }}>
          {message.sender === 'user' ? 
            <PersonIcon color="primary" /> : 
            <BotIcon color="secondary" />
          }
        </Box>
        
        <Paper
          elevation={1}
          sx={{
            p: 2,
            backgroundColor: message.sender === 'user' ? 'primary.light' : 'grey.100',
            color: message.sender === 'user' ? 'white' : 'text.primary',
            borderRadius: 2,
            ...(message.isError && { backgroundColor: 'error.light' })
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.text}
          </Typography>
          
          {message.actions && message.actions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {message.actions.map((action, index) => (
                <Chip
                  key={index}
                  label={`${action.type}: ${action.summary}`}
                  size="small"
                  color="info"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}
          
          {message.ticket && (
            <Box sx={{ mt: 2 }}>
              <Chip
                icon={<TicketIcon />}
                label={`Ticket Created: ${message.ticket.id}`}
                color="warning"
                size="small"
              />
            </Box>
          )}
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
            {formatTimestamp(message.timestamp)}
          </Typography>
        </Paper>
      </Box>
    </ListItem>
  );

  return (
    <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Main Chat Area */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h5" component="h1" gutterBottom>
                Unified In-App Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Session: {sessionId.substring(0, 20)}...
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  size="small"
                  label={llmHealth.healthy ? `LLM: ${llmHealth.provider} • Healthy` : (llmHealth.enabled ? `LLM: ${llmHealth.provider} • Unavailable` : 'LLM: Disabled')}
                  color={llmHealth.healthy ? 'success' : (llmHealth.enabled ? 'warning' : 'default')}
                />
                <Chip
                  size="small"
                  label={llmEnabled ? 'Using LLM for parsing' : 'Heuristic parsing'}
                  onClick={() => {
                    const next = !llmEnabled;
                    setLlmEnabled(next);
                    localStorage.setItem('useLLM', String(next));
                  }}
                  variant="outlined"
                  color={llmEnabled ? 'info' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <BotIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Welcome! Try typing: "Filter invoices for last month, vendor='IndiSky', status=failed"
                  </Typography>
                </Box>
              )}
              
              <List>
                {messages.map(renderMessage)}
                {isLoading && (
                  <ListItem>
                    <Box sx={{ width: '100%' }}>
                      <LinearProgress />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Assistant is thinking...
                      </Typography>
                    </Box>
                  </ListItem>
                )}
              </List>
              <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  variant="outlined"
                  disabled={isLoading}
                />
                <IconButton
                  color="primary"
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {/* Tickets */}
            <Paper elevation={3} sx={{ p: 2, flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Support Tickets
                </Typography>
                <IconButton size="small" onClick={refreshTickets}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              
              {tickets.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tickets yet
                </Typography>
              ) : (
                tickets.map((ticket) => (
                  <Card key={ticket.id} sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {ticket.id}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {ticket.description}
                      </Typography>
                      <Chip
                        label={ticket.status}
                        size="small"
                        color={ticket.status === 'open' ? 'warning' : 'success'}
                      />
                      <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                        {formatTimestamp(ticket.created)}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              )}
            </Paper>

            {/* Action Results */}
            <Paper elevation={3} sx={{ p: 2, flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Recent Actions
              </Typography>
              
              {actionResults.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No actions performed yet
                </Typography>
              ) : (
                actionResults.slice(-5).map((action, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {action.type}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {action.summary}
                      </Typography>
                      {action.downloadable && (
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => downloadReport(action.reportId)}
                        >
                          Download
                        </Button>
                      )}
                      <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                        {formatTimestamp(action.timestamp)}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              )}
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default App;