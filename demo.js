#!/usr/bin/env node

/**
 * Demo script to showcase the unified in-app assistant scenario
 */

const readline = require('readline');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let sessionId = 'demo_session_' + Date.now();

console.log('🚀 Unified In-App Assistant Demo');
console.log('=====================================\n');

console.log('This demo simulates the following scenario:');
console.log('1. Customer filters invoices for IndiSky with failed status');
console.log('2. Assistant explains why they failed (missing GSTIN)');
console.log('3. Customer creates a support ticket');
console.log('4. Next day: customer returns and downloads fixed report\n');

console.log(`Session ID: ${sessionId}\n`);

const demoSteps = [
  "Filter invoices for last month, vendor='IndiSky', status=failed",
  "Why did these fail?",
  "Create a ticket and notify me when fixed",
  "What's the status of my tickets?",
  "Download the fixed report"
];

let currentStep = 0;

function showMenu() {
  console.log('\n📋 Demo Options:');
  console.log('1. Run next demo step');
  console.log('2. Ask custom question');
  console.log('3. Check tickets');
  console.log('4. Show conversation history');
  console.log('5. Exit\n');
  
  rl.question('Choose an option (1-5): ', handleMenuChoice);
}

async function handleMenuChoice(choice) {
  switch (choice.trim()) {
    case '1':
      await runNextDemoStep();
      break;
    case '2':
      await askCustomQuestion();
      break;
    case '3':
      await checkTickets();
      break;
    case '4':
      await showHistory();
      break;
    case '5':
      console.log('👋 Demo ended. Thanks for trying the Unified In-App Assistant!');
      rl.close();
      return;
    default:
      console.log('❌ Invalid option. Please choose 1-5.');
  }
  showMenu();
}

async function runNextDemoStep() {
  if (currentStep >= demoSteps.length) {
    console.log('✅ All demo steps completed!');
    console.log('\nYou can now:');
    console.log('- Ask custom questions (option 2)');
    console.log('- Check ticket status (option 3)');
    console.log('- View conversation history (option 4)');
    return;
  }

  const message = demoSteps[currentStep];
  console.log(`\n🎬 Demo Step ${currentStep + 1}: "${message}"`);
  
  await sendMessage(message);
  currentStep++;
}

async function askCustomQuestion() {
  rl.question('\n💬 Enter your message: ', async (message) => {
    if (message.trim()) {
      await sendMessage(message);
    }
    showMenu();
  });
}

async function sendMessage(message) {
  try {
    console.log(`\n👤 You: ${message}`);
    console.log('🤔 Assistant is thinking...\n');

    const response = await axios.post(`${API_BASE}/chat`, {
      message,
      sessionId,
      context: {}
    });

    console.log(`🤖 Assistant: ${response.data.response}`);

    if (response.data.actions && response.data.actions.length > 0) {
      console.log('\n📊 Actions performed:');
      response.data.actions.forEach(action => {
        console.log(`  • ${action.type}: ${action.summary || 'Completed'}`);
      });
    }

    if (response.data.ticket) {
      console.log(`\n🎫 Ticket created: ${response.data.ticket.id}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm run dev');
    }
  }
}

async function checkTickets() {
  try {
    console.log('\n🎫 Checking tickets...');
    
    const response = await axios.get(`${API_BASE}/tickets?sessionId=${sessionId}`);
    const tickets = response.data;

    if (tickets.length === 0) {
      console.log('📭 No tickets found for this session.');
    } else {
      console.log(`\n🎫 Found ${tickets.length} ticket(s):`);
      tickets.forEach(ticket => {
        console.log(`\n  ID: ${ticket.id}`);
        console.log(`  Status: ${ticket.status}`);
        console.log(`  Priority: ${ticket.priority}`);
        console.log(`  Description: ${ticket.description}`);
        
        if (ticket.updates && ticket.updates.length > 0) {
          console.log('  Updates:');
          ticket.updates.forEach(update => {
            console.log(`    • ${update.message}`);
          });
        }
      });
    }
  } catch (error) {
    console.error('❌ Error fetching tickets:', error.message);
  }
}

async function showHistory() {
  try {
    console.log('\n📖 Conversation history...');
    
    const response = await axios.get(`${API_BASE}/conversations/${sessionId}`);
    const conversation = response.data;

    if (!conversation.messages || conversation.messages.length === 0) {
      console.log('📭 No conversation history found.');
    } else {
      console.log(`\n💬 Found ${conversation.messages.length} message(s):`);
      conversation.messages.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const sender = msg.sender === 'user' ? '👤' : '🤖';
        console.log(`\n  ${index + 1}. ${sender} [${time}]: ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}`);
      });
    }
  } catch (error) {
    console.error('❌ Error fetching history:', error.message);
  }
}

// Start the demo
console.log('Starting demo in interactive mode...\n');
showMenu();