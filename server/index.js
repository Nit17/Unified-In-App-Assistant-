const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (in production, use a database)
const conversations = new Map();
const tickets = new Map();
const invoiceData = require('./data/invoices');
const chatProcessor = require('./services/chatProcessor');
const actionExecutor = require('./services/actionExecutor');
const ticketManager = require('./services/ticketManager');
const llmService = require('./services/llmService');

// Routes

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    
    // Get or create conversation
    let conversation = conversations.get(sessionId) || {
      id: sessionId,
      messages: [],
      actions: [],
      created: new Date().toISOString()
    };

    // Add user message to conversation
    const userMessage = {
      id: uuidv4(),
      text: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    conversation.messages.push(userMessage);

    // Process the message
    const response = await chatProcessor.processMessage(message, {
      conversation,
      context,
      invoiceData,
      tickets: Array.from(tickets.values()).filter(t => t.sessionId === sessionId)
    });

    // Add assistant response to conversation
    const assistantMessage = {
      id: uuidv4(),
      text: response.text,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
      actions: response.actions,
      ticket: response.ticket
    };
    conversation.messages.push(assistantMessage);

    // Update stored conversation
    conversations.set(sessionId, conversation);

    // Handle actions if any
    if (response.actions && response.actions.length > 0) {
      response.actions.forEach(action => {
        action.sessionId = sessionId;
        conversation.actions.push(action);
      });
    }

    // Handle ticket creation
    if (response.ticket) {
      response.ticket.sessionId = sessionId;
      tickets.set(response.ticket.id, response.ticket);
    }

    res.json({
      response: response.text,
      actions: response.actions,
      ticket: response.ticket
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation history
app.get('/api/conversations/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversation = conversations.get(sessionId) || { messages: [], actions: [] };
    res.json(conversation);
  } catch (error) {
    console.error('Conversation fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tickets
app.get('/api/tickets', (req, res) => {
  try {
    const { sessionId } = req.query;
    let ticketList = Array.from(tickets.values());
    
    if (sessionId) {
      ticketList = ticketList.filter(ticket => ticket.sessionId === sessionId);
    }
    
    res.json(ticketList);
  } catch (error) {
    console.error('Tickets fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ticket status
app.patch('/api/tickets/:ticketId', (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, updates } = req.body;
    
    const ticket = tickets.get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    ticket.status = status || ticket.status;
    ticket.lastUpdated = new Date().toISOString();
    
    if (updates) {
      ticket.updates = ticket.updates || [];
      ticket.updates.push({
        timestamp: new Date().toISOString(),
        message: updates
      });
    }
    
    tickets.set(ticketId, ticket);
    res.json(ticket);
  } catch (error) {
    console.error('Ticket update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download report
app.get('/api/reports/:reportId/download', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Find the action that generated this report
    let reportData = null;
    for (const conversation of conversations.values()) {
      const action = conversation.actions.find(a => a.reportId === reportId);
      if (action && action.data) {
        reportData = action.data;
        break;
      }
    }
    
    if (!reportData) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Generate CSV
    const csv = actionExecutor.generateCSV(reportData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${reportId}.csv"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Report download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute specific actions (for testing)
app.post('/api/actions/execute', async (req, res) => {
  try {
    const { action, parameters } = req.body;
    const result = await actionExecutor.executeAction(action, parameters, invoiceData);
    res.json(result);
  } catch (error) {
    console.error('Action execution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    conversations: conversations.size,
    tickets: tickets.size
  });
});

// LLM health check
app.get('/api/llm/health', async (req, res) => {
  try {
    const status = await llmService.health();
    res.json(status);
  } catch (e) {
    res.status(500).json({ enabled: false, healthy: false, reason: e.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  
  // Simulate some ticket updates for demo
  setTimeout(() => {
    simulateTicketUpdates();
  }, 30000); // Start after 30 seconds
});

// Simulate ticket updates for demo purposes
function simulateTicketUpdates() {
  setInterval(() => {
    tickets.forEach((ticket, ticketId) => {
      if (ticket.status === 'open' && Math.random() < 0.1) { // 10% chance every interval
        ticket.status = 'resolved';
        ticket.lastUpdated = new Date().toISOString();
        ticket.updates = ticket.updates || [];
        ticket.updates.push({
          timestamp: new Date().toISOString(),
          message: 'Issue has been resolved. Missing GSTIN information has been added to all invoices.'
        });
        tickets.set(ticketId, ticket);
        console.log(`Updated ticket ${ticketId} to resolved status`);
      }
    });
  }, 60000); // Check every minute
}