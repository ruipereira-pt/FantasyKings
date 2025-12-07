# Supabase Edge Function Deployment Setup

This guide will help you find your Supabase credentials needed for automatic edge function deployment.

## Step 1: Find Your PROJECT_REF

### Method 1: From Project Settings (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (FantasyKings or your project name)
3. Click on **⚙️ Settings** (gear icon in the left sidebar)
4. Click on **General** under "Project Settings"
5. Scroll down to find **Reference ID**
6. Copy the Reference ID (it looks like: `abcdefghijklmnop`)

### Method 2: From Project URL

1. When you're in your Supabase project dashboard
2. Look at the browser URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
3. The `YOUR_PROJECT_REF` part is your project reference ID

### Method 3: From Project API Settings

1. Go to **Settings** → **API**
2. Look for **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
3. The `YOUR_PROJECT_REF` part is your project reference ID

---

## Step 2: Get Your ACCESS_TOKEN

1. Go to [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)
   - Or navigate: Dashboard → Your Profile (top right) → **Account** → **Access Tokens**

2. You'll see a list of existing tokens (if any)

3. To create a new token:
   - Click **Generate New Token** button
   - Give it a descriptive name like: `GitHub Actions Edge Function Deploy`
   - Click **Generate Token**
   - **⚠️ IMPORTANT:** Copy the token immediately - you won't be able to see it again!
   - The token looks like: `sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

4. Save this token securely - you'll need it for GitHub Secrets

---

## Step 3: Add to GitHub Secrets

### Option A: Using GitHub Web Interface

1. Go to your repository on GitHub: `https://github.com/ruipereira-pt/FantasyKings`
2. Click on **Settings** (top menu bar)
3. Click on **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** button
5. Add these two secrets:

   **Secret 1:**
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: Paste your access token (from Step 2)
   - Click **Add secret**

   **Secret 2:**
   - Name: `SUPABASE_PROJECT_REF`
   - Value: Paste your project reference ID (from Step 1)
   - Click **Add secret**

### Option B: Using GitHub CLI

```bash
# Add access token
gh secret set SUPABASE_ACCESS_TOKEN --repo ruipereira-pt/FantasyKings

# Add project ref
gh secret set SUPABASE_PROJECT_REF --repo ruipereira-pt/FantasyKings
```

---

## Step 4: Verify Secrets Are Set

You can verify your secrets are set by:

1. Going to **Settings** → **Secrets and variables** → **Actions**
2. You should see both secrets listed:
   - `SUPABASE_ACCESS_TOKEN` (hidden)
   - `SUPABASE_PROJECT_REF` (hidden)

---

## Step 5: Test Deployment (Optional)

After adding the secrets, you can test the deployment workflow:

```bash
# This will be done automatically when PR #28 is merged
# But you can manually trigger it from GitHub Actions tab
```

---

## Troubleshooting

### Can't find Reference ID?

- Make sure you're in the correct project
- Check that you have owner/admin access to the project

### Token not working?

- Verify the token hasn't expired (they don't expire, but can be revoked)
- Make sure you copied the full token (starts with `sbp_`)
- Generate a new token if needed

### Still having issues?

- Check Supabase documentation: https://supabase.com/docs/guides/cli
- Verify your GitHub repository has the correct permissions

---

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit tokens to git** - Always use GitHub Secrets
2. **Never share tokens** - Treat them like passwords
3. **Rotate tokens regularly** - If a token is compromised, revoke it and create a new one
4. **Use minimal permissions** - The token only needs access to deploy functions

---

## Quick Reference

| Item               | Where to Find                             | Example               |
| ------------------ | ----------------------------------------- | --------------------- |
| **PROJECT_REF**    | Settings → General → Reference ID         | `abcdefghijklmnop`    |
| **ACCESS_TOKEN**   | Account → Access Tokens → Generate New    | `sbp_xxxxxxxxxxxx`    |
| **GitHub Secrets** | Repository → Settings → Secrets → Actions | Add both secrets here |

---

## Next Steps

After adding the secrets:

1. ✅ The CI/CD pipeline will automatically deploy edge functions when code is merged to `main`
2. ✅ No manual deployment needed after PR #28 is merged
3. ✅ Edge functions will be kept in sync with your codebase
