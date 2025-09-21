<<<<<<< HEAD
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
  # Unified In-App Assistant

  This application demonstrates a unified in-app assistant that can do actions, explain context, create/track support tickets, and continue the conversation across sessions with role-appropriate visibility.

  Sample Scenario:
  - A customer types: “Filter invoices for last month, vendor=‘IndiSky’, status=failed.”
  - Then: “Why did these fail?” Assistant explains (e.g., “missing GSTIN in 7 files”).
  - Assistant offers: “Create a ticket and notify me when fixed.”
  - Next day, customer returns — chat shows prior context, open ticket, and a new update.
  - Customer says “download the fixed report.”

  ## Features

  - Conversational Interface: Natural language interaction with context awareness
  - Action Execution: Filter invoices, analyze data, generate reports
  - Ticket Management: Create, track, and update support tickets
  - Session Continuity: Maintain conversation history across sessions
  - Role-based Visibility: Different access levels for different user roles

  ## Sample Scenario (Try these prompts)

  1. Filter invoices for last month, vendor='IndiSky', status=failed
  2. Why did these fail?
  3. Create a ticket and notify me when fixed
  4. What's the status of my tickets?
  5. Download the fixed report

  ## Quick Start

  ```bash
  # Install all dependencies
  npm run install-all

  # Start development servers (client + server)
  npm run dev
  ```

  Frontend: http://localhost:3000
  Backend:  http://localhost:5000

  ## Architecture

  - Frontend: React with Material-UI for a modern chat interface
  - Backend: Express.js with in-memory data storage
  - Features:
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

  ## Optional: Local LLM Integration (Ollama)

  You can enable a local LLM to improve intent detection and entity extraction.

  1) Install Ollama (macOS/Linux/Windows): https://ollama.ai

  2) Pull a model (example):
    - `ollama pull llama3.1`

  3) Enable LLM in `.env` (or export env vars):
    - `LLM_ENABLED=true`
    - `LLM_PROVIDER=ollama`
    - `OLLAMA_BASE_URL=http://localhost:11434`
    - `OLLAMA_MODEL=llama3.1`

  4) Start the backend and check health:
    - Visit `http://localhost:5000/api/llm/health`

  You can also use OpenAI-compatible endpoints (LM Studio / OpenRouter / Azure OpenAI) by setting:
    - `LLM_PROVIDER=openai`
    - `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`

  ### UI Toggle and Status
  - The header shows an LLM status chip (Disabled / Unavailable / Healthy) and a chip to toggle parsing mode.
  - Toggling updates localStorage (`useLLM`) and affects subsequent chat requests.

  ### Rate Limits and Timeouts
  Configure via environment variables:
  - `LLM_TIMEOUT_MS` (default 15000)
  - `LLM_RPM` (requests per minute, default 30)

  ### Prompt Configuration
  Customize intent extraction prompts without code changes by editing:
  - `server/config/promptConfig.json`
  Fields:
  - `system`: system instruction
  - `intentInstruction`: formatting and schema
  - `examples`: few-shot examples to guide the model
