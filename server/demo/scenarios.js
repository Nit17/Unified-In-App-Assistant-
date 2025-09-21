const express = require('express');
const app = express();

// Demo script to simulate the exact scenario
const demoScenario = {
  steps: [
    {
      step: 1,
      description: "Customer filters invoices",
      input: "Filter invoices for last month, vendor='IndiSky', status=failed",
      expectedOutput: "Found X invoices with issues"
    },
    {
      step: 2,
      description: "Customer asks for explanation",
      input: "Why did these fail?",
      expectedOutput: "Analysis showing missing GSTIN in 7 files"
    },
    {
      step: 3,
      description: "Customer creates ticket",
      input: "Create a ticket and notify me when fixed",
      expectedOutput: "Ticket created with tracking"
    },
    {
      step: 4,
      description: "Next day - customer returns",
      input: "(New session with context retention)",
      expectedOutput: "Shows previous context and ticket updates"
    },
    {
      step: 5,
      description: "Customer downloads report",
      input: "Download the fixed report",
      expectedOutput: "Provides download link for updated report"
    }
  ]
};

// Sample conversation flow for testing
const sampleConversations = [
  {
    sessionId: "demo_session_1",
    messages: [
      {
        text: "Filter invoices for last month, vendor='IndiSky', status=failed",
        sender: "user",
        timestamp: new Date(Date.now() - 86400000).toISOString() // Yesterday
      },
      {
        text: "Found 12 invoices from IndiSky with status \"failed\" from last month.\n\nSummary:\n• Total Amount: ₹2,45,000\n• Average: ₹20,417\n\n⚠️ Issues found:\n• Missing GSTIN information in 7 invoices\n• Invalid payment reference in 3 invoices\n• Expired vendor certificate in 2 invoices",
        sender: "assistant",
        timestamp: new Date(Date.now() - 86400000 + 5000).toISOString()
      },
      {
        text: "Why did these fail?",
        sender: "user",
        timestamp: new Date(Date.now() - 86400000 + 300000).toISOString()
      },
      {
        text: "Analysis of 12 failed invoices:\n\nIssues identified:\n• Missing GSTIN information: 7 invoices\n• Invalid payment reference: 3 invoices\n• Expired vendor certificate: 2 invoices\n\nThe most common issue appears to be missing GSTIN information, which is required for compliance with Indian tax regulations.",
        sender: "assistant",
        timestamp: new Date(Date.now() - 86400000 + 305000).toISOString()
      },
      {
        text: "Create a ticket and notify me when fixed",
        sender: "user",
        timestamp: new Date(Date.now() - 86400000 + 600000).toISOString()
      },
      {
        text: "I've created support ticket TKT-20240921-001 for you. The ticket has been assigned priority \"high\" and our support team will investigate the issue.\n\nI'll notify you as soon as there are any updates. You can also check the ticket status in the sidebar.",
        sender: "assistant",
        timestamp: new Date(Date.now() - 86400000 + 605000).toISOString()
      }
    ],
    tickets: [
      {
        id: "TKT-20240921-001",
        description: "Issue with invoices: Missing GSTIN information, Invalid payment reference, Expired vendor certificate",
        priority: "high",
        status: "resolved", // Simulate it being resolved
        category: "Compliance",
        created: new Date(Date.now() - 86400000 + 605000).toISOString(),
        lastUpdated: new Date().toISOString(),
        updates: [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            message: "Issue has been resolved. Missing GSTIN information has been added to all invoices."
          }
        ]
      }
    ]
  }
];

module.exports = {
  demoScenario,
  sampleConversations
};