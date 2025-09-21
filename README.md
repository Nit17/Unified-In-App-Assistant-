# Unified In-App Assistant

A comprehensive chat assistant application demonstrating conversation continuity, action execution, context awareness, and ticket management.

## Features

- **Conversational Interface**: Natural language interaction with context awareness
- **Action Execution**: Filter invoices, analyze data, generate reports
- **Ticket Management**: Create, track, and update support tickets
- **Session Continuity**: Maintain conversation history across sessions
- **Role-based Visibility**: Different access levels for different user roles

## Sample Scenario

1. Customer: "Filter invoices for last month, vendor='IndiSky', status=failed."
2. Assistant analyzes and explains: "Found 7 failed invoices due to missing GSTIN"
3. Customer: "Create a ticket and notify me when fixed."
4. Next day: Chat shows prior context, ticket status, and new updates
5. Customer: "Download the fixed report."

## Quick Start

```bash
# Install all dependencies
npm run install-all

# Start development servers
npm run dev
```

## Architecture

- **Frontend**: React with Material-UI for modern chat interface
- **Backend**: Express.js with in-memory data storage
- **Features**: 
  - Conversation management
  - Invoice data processing
  - Ticket system
  - Context persistence
  - Action execution

## Usage

1. Open the application in your browser
2. Start typing natural language commands
3. Watch as the assistant executes actions and maintains context
4. Create tickets and see them tracked across sessions

## Technologies

- React.js
- Express.js
- Material-UI
- Socket.io (for real-time updates)
- Moment.js (for date handling)