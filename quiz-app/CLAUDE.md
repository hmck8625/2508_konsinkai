# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time quiz application built for corporate social events (懇親会クイズアプリ). It supports live quiz sessions with multiple participants, real-time scoring, and projector screen displays.

## Core Commands

### Development
```bash
npm install                 # Install dependencies
npm run dev                # Start development server (http://localhost:3000)
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
```

### Testing
The app can be tested locally with mock data when Vercel KV environment variables are not set. The system automatically falls back to mock KV storage.

## Architecture

### High-Level Structure
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes for all server-side logic
- **Database**: Vercel KV (Redis) with automatic TTL cleanup
- **Deployment**: Vercel with environment-specific configuration

### Key Data Flow
1. **Event Management**: Events are created with unique codes, questions are stored with metadata
2. **Player Management**: Players join via codes, nicknames are automatically deduplicated
3. **Answer Processing**: Real-time answer submission with server-side scoring validation
4. **Leaderboard**: Live ranking calculation based on score, time, and streak bonuses
5. **State Management**: Game state transitions managed via QuizService

### Core Services

#### KVService (`src/lib/kv.ts`)
- Singleton pattern for Vercel KV operations
- Automatic fallback to mock storage in development
- TTL-based data management with configurable expiration
- Key patterns: `event:{id}:*`, `event:{id}:player:{playerId}`, etc.

#### QuizService (`src/lib/quiz-service.ts`)
- Main business logic layer
- Handles event lifecycle, player management, answer processing
- Manages game state transitions: `lobby` → `Q{n}_open` → `Q{n}_closed` → `Q{n}_reveal` → `results`
- Implements scoring algorithms with speed bonuses and streak tracking

### API Endpoints Structure
```
/api/join          # Player registration
/api/answer        # Answer submission
/api/control       # Admin game control
/api/state         # Real-time game state
/api/participants  # Player management
```

### Page Structure
```
/                  # Home page
/join?e=CODE       # Player registration
/play             # Quiz answering interface
/host             # Admin control panel
/screen?e=CODE     # Projector display
```

## Environment Variables

### Required for Production
```env
KV_REST_API_URL=https://your-kv-xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token
ADMIN_SECRET=secure_admin_password
```

### Optional Configuration
```env
EVENT_TTL_SEC=86400        # Data retention (24 hours)
SPEED_BONUS_MAX=50         # Maximum speed bonus points
TIME_LIMIT_DEFAULT=20      # Default question time limit
```

## Data Models

### Core Types (`src/types/quiz.ts`)
- **QuizEvent**: Event metadata with configuration
- **Question**: Quiz questions with multiple choice answers
- **Player**: Participant information with device tracking
- **Answer**: Response data with timestamp and scoring
- **GameState**: Current state for real-time updates
- **LeaderboardEntry**: Ranked player information

### Key Business Rules
- **Scoring**: Base 100 points + speed bonus (up to 50) + streak bonus (50/100 for 3/5 consecutive)
- **Ranking**: Score (desc) → Total time (asc) → Join time (asc)
- **Security**: Admin actions require ADMIN_SECRET authentication
- **Data Lifecycle**: Automatic cleanup via TTL (24-48 hours)

## Development Patterns

### Service Pattern
All business logic is encapsulated in service classes. Use dependency injection pattern with singleton KVService.

### API Response Format
All API routes return consistent JSON structures with `success` boolean and appropriate error messages.

### Mock Development
The system automatically detects missing Vercel KV environment variables and switches to mock storage for local development.

### TypeScript Configuration
- Path mapping: `@/*` points to `src/*`
- Strict mode enabled with Next.js optimizations
- Target ES2017 for broad compatibility

## Security Considerations

- Admin endpoints protected by ADMIN_SECRET
- XSS protection headers configured in vercel.json
- No-cache headers for API responses
- Rate limiting should be considered for production
- TTL-based data cleanup prevents data accumulation

## Common Customization Points

### Scoring Logic
Modify `submitAnswer` method in QuizService for custom scoring algorithms.

### UI Themes
Update CSS custom properties in `src/app/globals.css`.

### Question Import Format
CSV format: `qid,title,choice1,choice2,choice3,choice4,answerIndex,timeLimitSec`

### Game State Machine
Extend EventStatus union type and update control logic for new states.

## Deployment Notes

- Uses Vercel's serverless functions with 30-second timeout
- Security headers configured for production
- URL rewrites: `/qr/:code` → `/join?e=:code`
- Redirects: `/admin` → `/host`
- Build output goes to `.next` directory