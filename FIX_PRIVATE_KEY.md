# 🔑 Fix GitHub App Private Key for Vercel

## ❌ Current Problem

Your `GITHUB_APP_PRIVATE_KEY_B64` in Vercel is **NOT properly base64 encoded**.

Current state:
- Length: 31 characters (should be ~3700+ for a proper RSA key)
- Starts with: binary gibberish (should start with base64 characters)

## ✅ Solution: Properly Encode the Private Key

### Step 1: Get Your Private Key

1. Go to: https://github.com/settings/apps
2. Click on your app (CodeSage)
3. Scroll down to **"Private keys"**
4. If you don't have one, click **"Generate a private key"** (it will download a `.pem` file)
5. If you already have one, you should have the `.pem` file downloaded

### Step 2: Base64 Encode It Properly

**On macOS/Linux:**
```bash
cat /path/to/your-app.2025-XX-XX.private-key.pem | base64 | tr -d '\n'
```

**Copy to clipboard (macOS):**
```bash
cat /path/to/your-app.2025-XX-XX.private-key.pem | base64 | tr -d '\n' | pbcopy
```

**On Windows (PowerShell):**
```powershell
$content = Get-Content "C:\path\to\your-app.2025-XX-XX.private-key.pem" -Raw
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content)) | clip
```

### Step 3: Update Vercel Environment Variable

1. Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
2. Find `GITHUB_APP_PRIVATE_KEY_B64`
3. Click **Edit**
4. **Paste the ENTIRE base64 string** (should be 3000-4000 characters long)
5. Apply to: **Production** (and Preview if you want)
6. Click **Save**

### Step 4: Redeploy

**Option A:** Push a new commit
```bash
git commit --allow-empty -m "Trigger redeploy with fixed private key"
git push
```

**Option B:** Manual redeploy in Vercel
- Go to **Deployments** tab
- Click **3 dots** on latest deployment → **Redeploy**

---

## 🔍 How to Verify It's Correct

After redeploying, the logs should show:

```
🔑 Using GITHUB_APP_PRIVATE_KEY_B64 (base64 encoded)
🔑 Decoded private key length: 1704 chars    ← Much longer!
🔑 Private key starts with: -----BEGIN RSA PRIVATE KEY-----  ← Correct format!
```

---

## 🎯 Expected Result

Once fixed:

```
Received webhook: pull_request
Processing PR #5 in shhdwi/book-a-book
Creating GitHub API client...
✅ GitHub API client created successfully
⚠️ Using hardcoded repository fallback
✅ Repository: shhdwi/book-a-book
✅ Loaded 1 agents from FALLBACK_AGENTS
Fetching changed files from PR #5...
Found 2 changed files                          ← Success!
Processing file: lib/main.dart
✅ Agent "Code Quality Guardian" reviewing lib/main.dart
🤖 Running AI generation...
📝 Posting comment on line 42...
✅ Comment posted successfully!                ← SUCCESS! 🎉
```

---

## 📝 Notes

- The private key should be **1600-1800 characters** when decoded
- It should start with `-----BEGIN RSA PRIVATE KEY-----` or `-----BEGIN PRIVATE KEY-----`
- The base64 encoded version will be **3000-4000+ characters**
- Make sure there are **NO extra newlines or spaces** when pasting into Vercel

---

**After updating the private key in Vercel and redeploying, trigger a new PR!** 🚀

