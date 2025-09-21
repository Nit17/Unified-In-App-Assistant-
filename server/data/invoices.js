const moment = require('moment');

// Generate sample invoice data
const generateInvoices = () => {
  const vendors = ['IndiSky', 'AirIndia', 'SpiceJet', 'GoAir', 'Vistara'];
  const statuses = ['paid', 'pending', 'failed', 'processing'];
  const invoices = [];

  // Generate invoices for the last 3 months
  for (let i = 0; i < 500; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = Math.floor(Math.random() * 100000) + 5000;
    const date = moment().subtract(Math.floor(Math.random() * 90), 'days');
    
    // Introduce issues for IndiSky failed invoices (missing GSTIN)
    const hasIssue = vendor === 'IndiSky' && status === 'failed' && Math.random() < 0.7;
    
    invoices.push({
      id: `INV-${String(i + 1).padStart(6, '0')}`,
      vendor: vendor,
      amount: amount,
      currency: 'INR',
      status: status,
      date: date.format('YYYY-MM-DD'),
      timestamp: date.toISOString(),
      gstin: hasIssue ? null : `${vendor.toUpperCase()}${Math.floor(Math.random() * 1000000000)}`,
      description: `Flight booking services - ${vendor}`,
      issues: hasIssue ? ['Missing GSTIN information'] : [],
      category: 'Travel',
      paymentMethod: ['Credit Card', 'Bank Transfer', 'UPI'][Math.floor(Math.random() * 3)],
      reference: `REF-${Math.floor(Math.random() * 1000000)}`
    });
  }

  return invoices;
};

module.exports = generateInvoices();