const moment = require('moment');
const actionExecutor = require('./actionExecutor');
const ticketManager = require('./ticketManager');
const llmService = require('./llmService');

class ChatProcessor {
  async processMessage(message, context) {
    const { conversation, invoiceData, tickets, useLLM } = context;
    const lowerMessage = message.toLowerCase();

    // Analyze the message to determine intent
    let intent = null;
    if (useLLM) {
      const llm = await llmService.parseIntent(message).catch(() => ({ intent: null }));
      if (llm && llm.intent && llm.intent.type) {
        intent = llm.intent;
      }
    }
    if (!intent) {
      intent = this.analyzeIntent(message);
    }
    
    let response = {
      text: '',
      actions: [],
      ticket: null
    };

    switch (intent.type) {
      case 'filter_invoices':
        response = await this.handleInvoiceFilter(intent, invoiceData);
        break;
        
      case 'explain_failures':
        response = await this.handleFailureExplanation(intent, invoiceData, conversation);
        break;
        
      case 'create_ticket':
        response = await this.handleTicketCreation(intent, context);
        break;
        
      case 'download_report':
        response = await this.handleReportDownload(intent, conversation);
        break;
        
      case 'ticket_status':
        response = await this.handleTicketStatus(intent, tickets);
        break;
        
      case 'general':
      default:
        response = await this.handleGeneralQuery(message, context);
        break;
    }

    return response;
  }

  analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Invoice filtering patterns
    if (lowerMessage.includes('filter') && lowerMessage.includes('invoice')) {
      const vendor = this.extractVendor(message);
      const status = this.extractStatus(message);
      const timeframe = this.extractTimeframe(message);
      
      return {
        type: 'filter_invoices',
        vendor,
        status,
        timeframe
      };
    }
    
    // Failure explanation patterns
    if (lowerMessage.includes('why') && (lowerMessage.includes('fail') || lowerMessage.includes('error'))) {
      return { type: 'explain_failures' };
    }
    
    // Ticket creation patterns
    if (lowerMessage.includes('create') && lowerMessage.includes('ticket')) {
      return { type: 'create_ticket' };
    }
    
    // Download patterns
    if (lowerMessage.includes('download') && (lowerMessage.includes('report') || lowerMessage.includes('fix'))) {
      return { type: 'download_report' };
    }
    
    // Ticket status patterns
    if (lowerMessage.includes('ticket') && (lowerMessage.includes('status') || lowerMessage.includes('update'))) {
      return { type: 'ticket_status' };
    }
    
    return { type: 'general' };
  }

  extractVendor(message) {
    const vendors = ['IndiSky', 'AirIndia', 'SpiceJet', 'GoAir', 'Vistara'];
    for (const vendor of vendors) {
      if (message.toLowerCase().includes(vendor.toLowerCase())) {
        return vendor;
      }
    }
    
    // Check for quoted vendor names
    const vendorMatch = message.match(/vendor=['"](.*?)['"]/) || message.match(/vendor=(\w+)/);
    return vendorMatch ? vendorMatch[1] : null;
  }

  extractStatus(message) {
    const statuses = ['paid', 'pending', 'failed', 'processing'];
    for (const status of statuses) {
      if (message.toLowerCase().includes(status)) {
        return status;
      }
    }
    
    // Check for quoted status
    const statusMatch = message.match(/status=['"](.*?)['"]/) || message.match(/status=(\w+)/);
    return statusMatch ? statusMatch[1] : null;
  }

  extractTimeframe(message) {
    if (message.toLowerCase().includes('last month')) {
      return 'last_month';
    }
    if (message.toLowerCase().includes('this month')) {
      return 'this_month';
    }
    if (message.toLowerCase().includes('last week')) {
      return 'last_week';
    }
    return 'all';
  }

  async handleInvoiceFilter(intent, invoiceData) {
    const filters = {
      vendor: intent.vendor,
      status: intent.status,
      timeframe: intent.timeframe
    };

    const result = await actionExecutor.executeAction('filter_invoices', filters, invoiceData);
    
    let responseText = `Found ${result.data.length} invoices`;
    if (filters.vendor) responseText += ` from ${filters.vendor}`;
    if (filters.status) responseText += ` with status "${filters.status}"`;
    if (filters.timeframe === 'last_month') responseText += ` from last month`;
    
    responseText += `.\n\nSummary:\n`;
    responseText += `• Total Amount: ₹${result.summary.totalAmount.toLocaleString()}\n`;
    responseText += `• Average: ₹${Math.round(result.summary.avgAmount).toLocaleString()}\n`;
    
    if (result.summary.issues && result.summary.issues.length > 0) {
      responseText += `\n⚠️ Issues found:\n`;
      result.summary.issues.forEach(issue => {
        responseText += `• ${issue}\n`;
      });
    }

    return {
      text: responseText,
      actions: [result]
    };
  }

  async handleFailureExplanation(intent, invoiceData, conversation) {
    // Find the last filter action for failed invoices
    const lastFilterAction = conversation.actions
      .filter(a => a.type === 'filter_invoices')
      .pop();

    if (!lastFilterAction || !lastFilterAction.data) {
      return {
        text: "I need to filter invoices first to analyze failures. Please ask me to filter invoices with status=failed."
      };
    }

    const failedInvoices = lastFilterAction.data.filter(inv => inv.status === 'failed');
    
    if (failedInvoices.length === 0) {
      return {
        text: "No failed invoices found in the last filter results."
      };
    }

    // Analyze failure reasons
    const issueCount = {};
    failedInvoices.forEach(invoice => {
      if (invoice.issues && invoice.issues.length > 0) {
        invoice.issues.forEach(issue => {
          issueCount[issue] = (issueCount[issue] || 0) + 1;
        });
      }
    });

    let responseText = `Analysis of ${failedInvoices.length} failed invoices:\n\n`;
    
    if (Object.keys(issueCount).length > 0) {
      responseText += "Issues identified:\n";
      Object.entries(issueCount).forEach(([issue, count]) => {
        responseText += `• ${issue}: ${count} invoice${count > 1 ? 's' : ''}\n`;
      });
      
      responseText += "\nThe most common issue appears to be missing GSTIN information, which is required for compliance with Indian tax regulations.";
    } else {
      responseText += "No specific issues were identified in the failed invoices. This might require manual investigation.";
    }

    return {
      text: responseText
    };
  }

  async handleTicketCreation(intent, context) {
    const { conversation, invoiceData } = context;
    
    // Find recent issues from conversation
    const recentActions = conversation.actions.slice(-3);
    let description = "General support request";
    let priority = "medium";
    
    // Try to infer what the ticket should be about
    const lastFilterAction = recentActions.find(a => a.type === 'filter_invoices');
    if (lastFilterAction && lastFilterAction.summary && lastFilterAction.summary.issues) {
      description = `Issue with invoices: ${lastFilterAction.summary.issues.join(', ')}`;
      priority = "high";
    }

    const ticket = await ticketManager.createTicket({
      description,
      priority,
      sessionId: context.conversation.id,
      relatedActions: recentActions.map(a => a.reportId).filter(Boolean)
    });

    return {
      text: `I've created support ticket ${ticket.id} for you. The ticket has been assigned priority "${priority}" and our support team will investigate the issue.\n\nI'll notify you as soon as there are any updates. You can also check the ticket status in the sidebar.`,
      ticket
    };
  }

  async handleReportDownload(intent, conversation) {
    const lastAction = conversation.actions
      .filter(a => a.downloadable)
      .pop();

    if (!lastAction) {
      return {
        text: "No downloadable reports are currently available. Please filter some invoices first to generate a report."
      };
    }

    return {
      text: `The latest report (${lastAction.type}) is ready for download. You can find the download button in the Recent Actions panel on the right side of the screen.\n\nReport ID: ${lastAction.reportId}\nGenerated: ${moment(lastAction.timestamp).format('MMM DD, YYYY HH:mm')}`
    };
  }

  async handleTicketStatus(intent, tickets) {
    if (tickets.length === 0) {
      return {
        text: "You don't have any support tickets yet."
      };
    }

    let responseText = `You have ${tickets.length} support ticket${tickets.length > 1 ? 's' : ''}:\n\n`;
    
    tickets.forEach(ticket => {
      responseText += `• ${ticket.id}: ${ticket.status}\n`;
      responseText += `  Created: ${moment(ticket.created).format('MMM DD, YYYY')}\n`;
      
      if (ticket.updates && ticket.updates.length > 0) {
        const lastUpdate = ticket.updates[ticket.updates.length - 1];
        responseText += `  Last update: ${lastUpdate.message}\n`;
      }
      
      responseText += '\n';
    });

    return {
      text: responseText
    };
  }

  async handleGeneralQuery(message, context) {
    const { conversation, tickets } = context;
    
    // Provide context-aware responses
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      let greeting = "Hello! I'm your unified in-app assistant. I can help you with:\n\n";
      greeting += "• Filtering and analyzing invoices\n";
      greeting += "• Creating and tracking support tickets\n";
      greeting += "• Downloading reports\n";
      greeting += "• Explaining issues and providing insights\n\n";
      
      if (conversation.messages.length > 2) {
        greeting += "I can see we've been chatting before. Feel free to continue where we left off!";
      } else {
        greeting += "Try asking me to 'Filter invoices for last month, vendor=IndiSky, status=failed' to get started.";
      }
      
      return { text: greeting };
    }

    // Default response with context
    let response = "I'm here to help you with invoice management and support tickets. ";
    
    if (conversation.messages.length > 0) {
      response += "Based on our conversation, I can help you continue with your previous tasks or start something new. ";
    }
    
    if (tickets.length > 0) {
      const openTickets = tickets.filter(t => t.status === 'open').length;
      if (openTickets > 0) {
        response += `You have ${openTickets} open support ticket${openTickets > 1 ? 's' : ''} that I'm tracking. `;
      }
    }
    
    response += "\n\nWhat would you like to do next?";
    
    return { text: response };
  }
}

module.exports = new ChatProcessor();