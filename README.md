# CodeSage - AI-Powered GitHub PR Review Bot

An intelligent, automated code review assistant that integrates with GitHub repositories to provide line-by-line code reviews using LLM-powered agents.

## Features

### Core Features
- **Automated PR Reviews**: Monitors pull requests and provides intelligent, line-specific code reviews
- **Multi-Agent System**: Configure multiple specialized review agents (Security Expert, Performance Reviewer, etc.)
- **Custom Prompts**: Define generation and evaluation prompts for each agent
- **Quality Evaluation**: Automated evaluation of review quality across multiple dimensions
- **Conversational Threads**: Bot responds to follow-up questions in review threads
- **User Feedback**: Thumbs up/down rating system with correlation analysis
- **Cost Tracking**: Monitor token usage and estimated costs per agent/repository

### Dashboard
- **Agent Management**: Create, edit, and configure review agents
- **Repository Bindings**: Assign agents to specific repositories
- **Review History**: Browse and search all reviews with filters
- **Analytics & Visualization**: 
  - Helpfulness trends over time
  - Per-agent comparison and leaderboards
  - Dimension breakdown (relevance, accuracy, actionability, clarity)
  - LLM vs. user feedback correlation
  - Cost tracking and trends

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (Supabase), Prisma ORM
- **Authentication**: NextAuth.js v5 with GitHub OAuth
- **GitHub Integration**: Octokit, GitHub Apps API
- **LLM**: OpenAI GPT-4o-mini
- **Charts**: Recharts
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended)
- GitHub account
- OpenAI API key

### 1. Clone and Install

```bash
git clone <repository-url>
cd code-sage
npm install
```

### 2. Database Setup

#### Using Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings → Database
3. Copy the "Connection string" (use the pooled connection)
4. Add to `.env.local` as `DATABASE_URL`

#### Initialize Database

```bash
npx prisma migrate dev --name init
```

### 3. GitHub OAuth App

Create a GitHub OAuth App for user authentication:

1. Go to GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. **Application name**: CodeSage
3. **Homepage URL**: `http://localhost:3000` (dev) or your production URL
4. **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
5. Copy **Client ID** → add to `.env.local` as `GITHUB_ID`
6. Generate **Client Secret** → add to `.env.local` as `GITHUB_SECRET`

### 4. GitHub App (for Bot)

Create a GitHub App for PR review bot functionality:

1. Go to GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App
2. **GitHub App name**: CodeSage Bot (must be unique)
3. **Homepage URL**: Your app URL
4. **Webhook URL**: `https://your-domain.com/api/github/webhook` (use ngrok for local dev)
5. **Webhook secret**: Generate a random secret, add to `.env.local` as `GITHUB_WEBHOOK_SECRET`
6. **Repository permissions**:
   - Contents: Read
   - Pull requests: Read & Write
   - Issues: Read & Write (for conversational threads)
7. **Subscribe to events**:
   - Pull request
   - Pull request review comment
   - Issue comment
8. **Generate a private key**:
   - Click "Generate a private key" at bottom
   - Download the `.pem` file
   - Convert to base64: `cat private-key.pem | base64 | tr -d '\n'`
   - Add to `.env.local` as `GITHUB_APP_PRIVATE_KEY_B64`
9. Copy **App ID** → add to `.env.local` as `GITHUB_APP_ID`
10. **Install the app** on your repositories

### 5. OpenAI API Key

1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env.local` as `OPENAI_API_KEY`

### 6. Environment Variables

Create `.env.local` file in project root:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-random-secret>"
GITHUB_ID="<oauth-app-client-id>"
GITHUB_SECRET="<oauth-app-client-secret>"
GITHUB_APP_ID="<github-app-id>"
GITHUB_APP_PRIVATE_KEY_B64="<base64-encoded-private-key>"
GITHUB_WEBHOOK_SECRET="<webhook-secret>"
OPENAI_API_KEY="sk-..."
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 7. Local Development with Webhooks

Use ngrok to expose your local server for GitHub webhooks:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000
```

Update your GitHub App's webhook URL to the ngrok URL (e.g., `https://abc123.ngrok.io/api/github/webhook`).

### 8. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

## Usage

### 1. Create an Agent

1. Navigate to **Dashboard → Agents → New Agent**
2. Configure:
   - **Name**: e.g., "Security Expert", "Performance Reviewer"
   - **Generation Prompt**: System prompt for code review (use variables: `{code_chunk}`, `{file_type}`, `{file_path}`)
   - **Evaluation Prompt**: Prompt for evaluating review quality
   - **File Type Filters**: e.g., `.ts, .tsx, .js` (leave empty for all files)
   - **Severity Threshold**: 1-5 (only post comments at or above this severity)
3. **Test** the prompt with sample code
4. **Save**

### 2. Bind Agent to Repositories

1. Navigate to **Dashboard → Repositories**
2. Check the boxes to assign agents to repositories

### 3. Open a Pull Request

When a PR is opened or updated on a bound repository, the bot will:
1. Fetch the diff
2. Analyze changed lines with the agent's prompt
3. Post line-specific review comments
4. Evaluate each comment's quality
5. Track token usage and costs

### 4. Conversational Threads

Reply to a bot comment in the PR, and the bot will respond contextually based on the original code and review.

### 5. View Analytics

Navigate to **Dashboard → Analytics** to see:
- Helpfulness trends over time
- Per-agent comparison and leaderboard
- Evaluation dimension breakdown
- Cost tracking
- LLM vs. user feedback correlation

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set all environment variables
4. Deploy
5. Update GitHub App webhook URL to your Vercel URL

### Important Notes

- Ensure `NEXTAUTH_URL` matches your production domain
- Set `NEXTAUTH_SECRET` to a secure random value
- Update GitHub App webhook URL and OAuth callback URL to production URLs

## Project Structure

```
/app
  /api              # API routes (webhooks, CRUD, analytics)
  /dashboard        # Dashboard pages
  /auth             # Authentication pages
/components         # React components
/lib                # Utilities (Prisma, Octokit, Auth)
/server             # Server-side logic (handlers, LLM, diff parsing)
/prisma             # Database schema
/tests              # Unit, integration, and E2E tests
```

## Architecture

1. **GitHub Webhook** → `/api/github/webhook` → `pr.ts` handler
2. **PR Handler**:
   - Fetches PR files and diffs
   - Loads bound agents
   - Parses diffs to find changed lines
   - Calls LLM for each line
   - Posts comments to GitHub
   - Evaluates comments
   - Tracks costs
3. **Comment Handler** (conversational threads):
   - Detects replies to bot comments
   - Generates contextual responses
   - Posts threaded replies

## License

MIT

## Contributing

Pull requests welcome! Please follow the existing code style and add tests for new features.
