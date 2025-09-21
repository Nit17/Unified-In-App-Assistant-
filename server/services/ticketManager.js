const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class TicketManager {
  async createTicket(options) {
    const {
      description,
      priority = 'medium',
      sessionId,
      relatedActions = []
    } = options;

    const ticketId = this.generateTicketId();
    
    const ticket = {
      id: ticketId,
      description,
      priority,
      status: 'open',
      sessionId,
      relatedActions,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      assignee: null,
      category: this.categorizeTicket(description),
      updates: [],
      estimatedResolution: this.estimateResolution(priority, description)
    };

    return ticket;
  }

  generateTicketId() {
    const prefix = 'TKT';
    const timestamp = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  categorizeTicket(description) {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('invoice') || lowerDesc.includes('billing')) {
      return 'Billing';
    }
    if (lowerDesc.includes('gstin') || lowerDesc.includes('tax')) {
      return 'Compliance';
    }
    if (lowerDesc.includes('payment') || lowerDesc.includes('transaction')) {
      return 'Payment';
    }
    if (lowerDesc.includes('technical') || lowerDesc.includes('system')) {
      return 'Technical';
    }
    
    return 'General';
  }

  estimateResolution(priority, description) {
    const baseDays = {
      'low': 7,
      'medium': 3,
      'high': 1,
      'critical': 0.5
    };

    const days = baseDays[priority] || 3;
    
    // Adjust based on description complexity
    if (description.toLowerCase().includes('gstin') || description.toLowerCase().includes('compliance')) {
      // Compliance issues might take longer due to regulatory requirements
      return moment().add(Math.ceil(days * 1.5), 'days').toISOString();
    }
    
    return moment().add(days, 'days').toISOString();
  }

  async updateTicket(ticketId, updates) {
    const update = {
      timestamp: new Date().toISOString(),
      ...updates
    };

    return update;
  }

  async resolveTicket(ticketId, resolution) {
    const update = {
      status: 'resolved',
      resolution,
      resolvedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    return update;
  }

  async escalateTicket(ticketId, reason) {
    const update = {
      status: 'escalated',
      escalationReason: reason,
      escalatedAt: new Date().toISOString(),
      priority: 'high', // Auto-escalate priority
      timestamp: new Date().toISOString()
    };

    return update;
  }

  getTicketTemplate(category) {
    const templates = {
      'Billing': {
        description: 'Issue with invoice processing',
        requiredInfo: ['Invoice ID', 'Vendor', 'Amount', 'Error message'],
        category: 'Billing'
      },
      'Compliance': {
        description: 'Compliance or regulatory issue',
        requiredInfo: ['Document type', 'Compliance requirement', 'Missing information'],
        category: 'Compliance'
      },
      'Payment': {
        description: 'Payment processing issue',
        requiredInfo: ['Transaction ID', 'Amount', 'Payment method', 'Error code'],
        category: 'Payment'
      },
      'Technical': {
        description: 'Technical system issue',
        requiredInfo: ['System component', 'Error message', 'Steps to reproduce'],
        category: 'Technical'
      }
    };

    return templates[category] || templates['General'];
  }
}

module.exports = new TicketManager();