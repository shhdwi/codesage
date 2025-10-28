# GitHub App Setup Guide

This guide walks you through creating and configuring a GitHub App for the CodeSage PR Review Bot.

## Step 1: Create a New GitHub App

1. Go to your GitHub account settings
2. Navigate to **Settings → Developer settings → GitHub Apps**
3. Click **New GitHub App**

## Step 2: Basic Information

- **GitHub App name**: `CodeSage Bot` (or any unique name)
- **Description**: AI-powered code review assistant
- **Homepage URL**: 
  - Development: `http://localhost:3000`
  - Production: Your deployed app URL
- **Callback URL**: Leave empty (not needed for GitHub Apps)

## Step 3: Webhook Configuration

- **Webhook URL**: 
  - Development: Use ngrok (`https://abc123.ngrok.io/api/github/webhook`)
  - Production: `https://your-domain.com/api/github/webhook`
- **Webhook secret**: Generate a random string (save this for `.env.local`)
  ```bash
  openssl rand -hex 20
  ```

## Step 4: Permissions

### Repository permissions:
- **Contents**: Read-only
- **Issues**: Read and write (for conversational threads)
- **Pull requests**: Read and write
- **Metadata**: Read-only (automatically selected)

### Organization permissions:
- None required (optional: Members - Read for team context)

## Step 5: Subscribe to Events

Check these events:
- ✅ Pull request
- ✅ Pull request review comment
- ✅ Issue comment

## Step 6: Installation

- **Where can this GitHub App be installed?**: 
  - "Only on this account" (recommended for testing)
  - "Any account" (for public distribution)

## Step 7: Create the App

Click **Create GitHub App** at the bottom of the page.

## Step 8: Generate Private Key

1. After creation, scroll down to **Private keys**
2. Click **Generate a private key**
3. A `.pem` file will be downloaded
4. Convert to base64:
   ```bash
   cat path/to/private-key.pem | base64 | tr -d '\n'
   ```
5. Copy the base64 string to your `.env.local` as `GITHUB_APP_PRIVATE_KEY_B64`

## Step 9: Note Your App ID

- Copy the **App ID** (shown at the top)
- Add to `.env.local` as `GITHUB_APP_ID`

## Step 10: Install the App

1. Go to **Install App** in the left sidebar
2. Click **Install** next to your account/organization
3. Choose:
   - **All repositories** (bot will have access to all), or
   - **Only select repositories** (choose specific repos)
4. Click **Install**

## Step 11: Test the Webhook

1. Start your dev server: `npm run dev`
2. Start ngrok: `ngrok http 3000`
3. Update your GitHub App webhook URL to the ngrok URL
4. Open a PR in a repository where the app is installed
5. Check your server logs for webhook events

## Environment Variables

After setup, your `.env.local` should include:

```env
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY_B64="<base64-encoded-pem>"
GITHUB_WEBHOOK_SECRET="<your-webhook-secret>"
```

## Troubleshooting

### Webhook not received

- Check ngrok is running and URL is correct
- Verify webhook secret matches
- Check Recent Deliveries in GitHub App settings
- Look for signature verification errors in logs

### 404 on webhook

- Ensure route is `/api/github/webhook` (case-sensitive)
- Check Next.js dev server is running

### Authentication failed

- Verify App ID is correct
- Ensure private key is base64 encoded correctly
- Check app is installed on the repository

## Production Deployment

When deploying to production:

1. Update webhook URL to your production domain
2. Set environment variables in your hosting platform
3. Ensure HTTPS is enabled
4. Consider using webhook secrets for security

