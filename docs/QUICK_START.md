# Quick Start Guide

Get CodeSage up and running in 15 minutes.

## Prerequisites

- Node.js 18+
- A Supabase account (free tier works)
- A GitHub account
- An OpenAI API key

## 5-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

Create a Supabase project and copy the connection string:

```bash
# Add to .env.local
DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate dev
```

### 3. Configure Authentication

Create a GitHub OAuth App and add credentials to `.env.local`:

```env
GITHUB_ID="your-oauth-client-id"
GITHUB_SECRET="your-oauth-client-secret"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Setup GitHub App

Follow `docs/GITHUB_APP_SETUP.md` to create a GitHub App, then add:

```env
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY_B64="<base64-encoded-pem>"
GITHUB_WEBHOOK_SECRET="<your-secret>"
```

### 5. Add OpenAI Key

```env
OPENAI_API_KEY="sk-..."
```

## Run

```bash
# Start dev server
npm run dev

# In another terminal (for local webhooks)
ngrok http 3000
```

Update your GitHub App webhook URL to the ngrok URL.

## First Agent

1. Visit `http://localhost:3000`
2. Sign in with GitHub
3. Create your first agent
4. Bind it to a repository
5. Open a PR and watch the magic! ✨

## Troubleshooting

- **"No repositories found"**: Install the GitHub App on your repos
- **Webhooks not working**: Check ngrok URL matches GitHub App settings
- **Build errors**: Run `npx prisma generate`

## Next Steps

- Customize agent prompts
- Set file type filters
- View analytics dashboard
- Enable conversational threads

See full README.md for detailed instructions.

