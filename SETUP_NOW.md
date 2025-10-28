# Setup Instructions - Complete This Now!

## Step 1: Configure Environment Variables ✅ (DO THIS FIRST)

Copy `.env.configured` to `.env.local`:

```bash
cp .env.configured .env.local
```

## Step 2: Create GitHub OAuth App (For User Login) 🔐

**Time: 2 minutes**

1. Go to: https://github.com/settings/developers
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - **Application name**: `CodeSage` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. You'll see **Client ID** → Copy it
6. Click **Generate a new client secret** → Copy the secret
7. **Add to `.env.local`**:
   ```
   GITHUB_ID="<paste-client-id>"
   GITHUB_SECRET="<paste-client-secret>"
   ```

## Step 3: Create GitHub App (For Bot) 🤖

**Time: 5 minutes**

### 3.1 Start Creating the App

1. Go to: https://github.com/settings/apps
2. Click **New GitHub App**

### 3.2 Fill Basic Info

- **GitHub App name**: `CodeSage Bot` (must be unique globally - add your username if taken)
- **Description**: `AI-powered code review assistant`
- **Homepage URL**: `http://localhost:3000`

### 3.3 Webhook Configuration

- **Webhook**: ✅ Check "Active"
- **Webhook URL**: `http://localhost:3000/api/github/webhook` (we'll use ngrok later)
- **Webhook secret**: `9260f5abefb0e5457e75f304d179b521d1509ddf` (already generated)

### 3.4 Set Permissions

**Repository permissions:**
- **Contents**: Read-only
- **Issues**: Read and write
- **Pull requests**: Read and write
- **Metadata**: Read-only (auto-selected)

**Subscribe to events** (check these):
- ✅ Pull request
- ✅ Pull request review comment
- ✅ Issue comment

### 3.5 Where to Install

- Select: **Only on this account**

### 3.6 Create & Configure

1. Click **Create GitHub App**
2. After creation, you'll see your **App ID** at the top → Copy it
3. Add to `.env.local`:
   ```
   GITHUB_APP_ID="<paste-app-id>"
   ```

### 3.7 Generate Private Key

1. Scroll down to **Private keys**
2. Click **Generate a private key**
3. A `.pem` file will download
4. Convert to base64:
   ```bash
   cat ~/Downloads/your-app-name.*.private-key.pem | base64 | tr -d '\n'
   ```
5. Copy the output and add to `.env.local`:
   ```
   GITHUB_APP_PRIVATE_KEY_B64="<paste-base64-string>"
   ```

### 3.8 Install the App

1. In the GitHub App page, click **Install App** (left sidebar)
2. Click **Install** next to your account
3. Choose:
   - **All repositories** (recommended), OR
   - **Only select repositories** (choose test repos)
4. Click **Install**

## Step 4: Run Database Migrations 🗄️

After `.env.local` is fully configured:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This creates all database tables.

## Step 5: Start the App 🚀

```bash
npm run dev
```

Open http://localhost:3000 and sign in with GitHub!

## Step 6: Setup Local Webhook Testing (Optional for now)

For the bot to work with local development:

```bash
# Terminal 1: App running
npm run dev

# Terminal 2: ngrok tunnel
npx ngrok http 3000
```

Then update your GitHub App webhook URL to the ngrok URL (e.g., `https://abc123.ngrok.io/api/github/webhook`)

## Quick Verification Checklist

Before starting:
- [ ] `.env.local` exists with all values filled
- [ ] GITHUB_ID and GITHUB_SECRET are set (OAuth App)
- [ ] GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_B64 are set (GitHub App)
- [ ] Database migrations ran successfully
- [ ] `npm run dev` starts without errors
- [ ] Can access http://localhost:3000

## Troubleshooting

**"Missing required environment variable: DATABASE_URL"**
- Make sure you copied `.env.configured` to `.env.local`

**Can't sign in with GitHub**
- Verify GITHUB_ID and GITHUB_SECRET are correct
- Check callback URL is exactly: `http://localhost:3000/api/auth/callback/github`

**Bot not posting comments**
- Install the GitHub App on your repositories
- Set up ngrok and update webhook URL
- Check webhook deliveries in GitHub App settings

---

**Ready? Start with Step 1!**

