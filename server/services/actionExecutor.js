const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

class ActionExecutor {
  async executeAction(actionType, parameters, data) {
    switch (actionType) {
      case 'filter_invoices':
        return this.filterInvoices(parameters, data);
      case 'analyze_failures':
        return this.analyzeFailures(parameters, data);
      case 'generate_report':
        return this.generateReport(parameters, data);
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  filterInvoices(filters, invoiceData) {
    let filteredInvoices = [...invoiceData];
    
    // Apply vendor filter
    if (filters.vendor) {
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.vendor.toLowerCase() === filters.vendor.toLowerCase()
      );
    }
    
    // Apply status filter
    if (filters.status) {
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.status.toLowerCase() === filters.status.toLowerCase()
      );
    }
    
    // Apply timeframe filter
    if (filters.timeframe) {
      const now = moment();
      let startDate;
      
      switch (filters.timeframe) {
        case 'last_month':
          startDate = now.clone().subtract(1, 'month').startOf('month');
          const endDate = now.clone().subtract(1, 'month').endOf('month');
          filteredInvoices = filteredInvoices.filter(invoice => {
            const invoiceDate = moment(invoice.date);
            return invoiceDate.isBetween(startDate, endDate, null, '[]');
          });
          break;
        case 'this_month':
          startDate = now.clone().startOf('month');
          filteredInvoices = filteredInvoices.filter(invoice => {
            const invoiceDate = moment(invoice.date);
            return invoiceDate.isSameOrAfter(startDate);
          });
          break;
        case 'last_week':
          startDate = now.clone().subtract(1, 'week');
          filteredInvoices = filteredInvoices.filter(invoice => {
            const invoiceDate = moment(invoice.date);
            return invoiceDate.isSameOrAfter(startDate);
          });
          break;
      }
    }
    
    // Generate summary
    const summary = this.generateSummary(filteredInvoices);
    
    const reportId = uuidv4();
    
    return {
      type: 'filter_invoices',
      reportId,
      data: filteredInvoices,
      summary,
      timestamp: new Date().toISOString(),
      downloadable: true,
      filters: filters
    };
  }

  analyzeFailures(parameters, invoiceData) {
    const failedInvoices = invoiceData.filter(invoice => invoice.status === 'failed');
    
    // Analyze failure patterns
    const analysis = {
      totalFailed: failedInvoices.length,
      byVendor: {},
      byIssue: {},
      byMonth: {},
      recommendations: []
    };
    
    failedInvoices.forEach(invoice => {
      // Group by vendor
      analysis.byVendor[invoice.vendor] = (analysis.byVendor[invoice.vendor] || 0) + 1;
      
      // Group by issue
      if (invoice.issues && invoice.issues.length > 0) {
        invoice.issues.forEach(issue => {
          analysis.byIssue[issue] = (analysis.byIssue[issue] || 0) + 1;
        });
      }
      
      // Group by month
      const month = moment(invoice.date).format('YYYY-MM');
      analysis.byMonth[month] = (analysis.byMonth[month] || 0) + 1;
    });
    
    // Generate recommendations
    if (analysis.byIssue['Missing GSTIN information'] > 0) {
      analysis.recommendations.push('Update vendor records to include GSTIN information');
    }
    
    const reportId = uuidv4();
    
    return {
      type: 'analyze_failures',
      reportId,
      data: failedInvoices,
      analysis,
      timestamp: new Date().toISOString(),
      downloadable: true
    };
  }

  generateSummary(invoices) {
    const summary = {
      count: invoices.length,
      totalAmount: 0,
      avgAmount: 0,
      vendors: new Set(),
      statuses: {},
      issues: new Set()
    };
    
    invoices.forEach(invoice => {
      summary.totalAmount += invoice.amount;
      summary.vendors.add(invoice.vendor);
      summary.statuses[invoice.status] = (summary.statuses[invoice.status] || 0) + 1;
      
      if (invoice.issues && invoice.issues.length > 0) {
        invoice.issues.forEach(issue => summary.issues.add(issue));
      }
    });
    
    summary.avgAmount = summary.count > 0 ? summary.totalAmount / summary.count : 0;
    summary.vendors = Array.from(summary.vendors);
    summary.issues = Array.from(summary.issues);
    
    return summary;
  }

  generateCSV(data) {
    if (!data || data.length === 0) {
      return 'No data available';
    }
    
    // Get all unique keys from the data
    const headers = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'issues') { // Handle issues separately
          headers.add(key);
        }
      });
    });
    
    headers.add('issues'); // Add issues column at the end
    const headerArray = Array.from(headers);
    
    // Create CSV content
    let csv = headerArray.join(',') + '\n';
    
    data.forEach(item => {
      const row = headerArray.map(header => {
        let value = item[header];
        
        if (header === 'issues' && Array.isArray(value)) {
          value = value.join('; ');
        }
        
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        
        return value || '';
      });
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
}

module.exports = new ActionExecutor();