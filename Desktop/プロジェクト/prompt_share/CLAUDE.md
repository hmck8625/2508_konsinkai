# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This repository contains an LLM conversation capture and sharing system with three main components:

### 1. Browser Extension (`llm-knowledge-hub-extension/`)
A Chrome/Chromium extension that captures conversations from LLM platforms (ChatGPT, Claude, Copilot) and sends them to a knowledge hub for team sharing.

**Key Components:**
- `background.js`: Service worker handling API communication, storage, and coordination between content scripts
- `content/`: Platform-specific content scripts for conversation detection
  - `common.js`: Base class `LLMContentCommon` with shared functionality
  - `chatgpt.js`: ChatGPT-specific detector extending `LLMContentCommon`
  - `claude.js`, `copilot.js`: Platform-specific implementations
- `popup/`: Extension popup UI for status and controls
- `options/`: Settings page for configuration

**Architecture Pattern:** The extension uses a service worker pattern with message passing between content scripts and background script, implementing conversation value assessment and real-time/batch data transmission.

### 2. Backend API (`llm-knowledge-hub/backend/`)
Express.js TypeScript API server for receiving and managing conversation data.

**Development Commands:**
```bash
cd llm-knowledge-hub/backend
npm run dev          # Development server with nodemon
npm run build        # TypeScript compilation
npm start           # Production server
npm test            # Jest tests
```

### 3. Frontend Web App (`llm-knowledge-hub/frontend/`)
React TypeScript application for browsing and managing shared conversations.

**Development Commands:**
```bash
cd llm-knowledge-hub/frontend
npm start           # Development server (localhost:3000)
npm run build       # Production build
npm test            # React tests
```

## Development Workflow

### Extension Development
- Extension loads unpacked from `llm-knowledge-hub-extension/` directory
- No build process required - direct JavaScript files
- Test on target LLM platforms: ChatGPT, Claude, Copilot
- Extension communicates with backend API endpoint configured in `background.js`

### Backend Development
- TypeScript compilation outputs to `dist/` directory
- API endpoint: `/api/v1` with health check at `/health`
- Middleware: helmet, cors, compression, express.json (10mb limit)
- Environment variables via dotenv

### Frontend Development
- Standard Create React App setup
- TypeScript with React 19
- Test setup with Testing Library

## Key Technical Details

### Extension Message Flow
1. Content scripts detect conversations using platform-specific selectors
2. `LLMContentCommon.extractConversationData()` processes messages
3. Background script validates, assesses value, and sanitizes data
4. Data transmitted to API endpoint with auth token
5. Local storage maintains conversation cache (max 100 items)

### Conversation Value Assessment
Located in `background.js:assessConversationValue()`:
- Complexity scoring (0-30 points): technical keywords
- Professionality scoring (0-30 points): business keywords  
- Completeness scoring (0-20 points): response length/detail
- Originality scoring (0-20 points): prompt uniqueness
- Threshold: 50+ points for saving

### Platform Detection
- ChatGPT: `chat.openai.com`, selector: `#prompt-textarea`
- Claude: `claude.ai`, content script: `claude.js`
- Copilot: `copilot.microsoft.com`, content script: `copilot.js`

## Testing

### Extension Testing
- Load unpacked extension in Chrome developer mode
- Navigate to supported LLM platforms
- Check console logs for "LLM Knowledge Hub" messages
- Test conversation detection and API communication

### API Testing
- Health endpoint: `GET /health`
- Main API: `POST /api/v1` (placeholder implementation)
- Error handling for 500/404 responses

### Frontend Testing
React Testing Library setup included for component testing.

## Security & Privacy

### Data Sanitization
Automatic masking in `background.js:sanitizeConversation()`:
- Email addresses → `[email]`
- Phone numbers → `[phone]`
- Credit cards → `[creditCard]`
- Personal IDs → `[personalId]`
- Configurable exclude patterns → `[FILTERED]`

### Storage Management
- Local conversation limit: 100 items
- Automatic cleanup: 30-day retention
- Auth token storage: 24-hour expiration
- Chrome storage APIs for sync/local data