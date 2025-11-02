# GitHub Secrets Setup Guide

## 🔑 Types of GitHub Secrets/Variables

### 1. **Repository Secrets** (Recommended for this case)

- **Location**: Repository → Settings → Secrets and variables → Actions → **Repository secrets**
- **Scope**: Available to ALL workflows in the repository
- **Access**: Any workflow can use them
- **Best for**: Shared configuration, build variables used across multiple workflows

### 2. **Environment Secrets** (Optional, more secure)

- **Location**: Repository → Settings → Environments → `production` → **Environment secrets**
- **Scope**: Only available to workflows that specify `environment: production`
- **Access**: Requires workflow to explicitly reference the environment
- **Best for**: Production-only secrets that shouldn't be in development builds

### 3. **Variables** (Public, visible)

- **Location**: Repository → Settings → Secrets and variables → Actions → **Variables**
- **Scope**: Similar to repository secrets
- **Difference**: **Visible in logs** (not encrypted)
- **Best for**: Non-sensitive configuration that's okay to be public

## ✅ For Your Use Case: **Repository Secrets**

Since your workflow uses:

```yaml
environment:
  name: production
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

**You have 2 options:**

### Option 1: Repository Secrets (Easier, Recommended) ✅

**Why:**

- ✅ Works with current workflow setup
- ✅ Available to all workflows (CI, deploy, etc.)
- ✅ Easier to manage

**How to set up:**

1. Go to: `https://github.com/ruipereira-pt/FantasyKings/settings/secrets/actions`
2. Click **"New repository secret"**
3. Add:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase URL (`https://your-project.supabase.co`)
4. Click **"Add secret"**
5. Repeat for `VITE_SUPABASE_ANON_KEY`

### Option 2: Environment Secrets (More Secure) 🔒

**Why:**

- ✅ Only available to production deployments
- ✅ More restricted access
- ✅ Better security isolation

**How to set up:**

1. Go to: `https://github.com/ruipereira-pt/FantasyKings/settings/environments`
2. Click **"New environment"** (or edit existing `production`)
3. Name it: `production`
4. Click **"Add secret"** in the Environment secrets section
5. Add:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase URL
6. Repeat for `VITE_SUPABASE_ANON_KEY`

**Note**: If you use environment secrets, the workflow will prioritize them over repository secrets when `environment: production` is specified.

## 🔍 Priority Order

When `environment: production` is specified, GitHub Actions checks in this order:

1. **Environment secrets** (for `production` environment) ← Highest priority
2. **Repository secrets** ← Fallback
3. **Variables** ← Last resort (and visible in logs)

## 📝 Step-by-Step: Setting Repository Secrets

### Step 1: Navigate to Secrets

1. Go to your repository: `https://github.com/ruipereira-pt/FantasyKings`
2. Click **Settings** (top menu)
3. In left sidebar: **Secrets and variables** → **Actions**
4. Click **"New repository secret"**

### Step 2: Add First Secret

```
Name: VITE_SUPABASE_URL
Secret: https://daczuujxslepsrqedttv.supabase.co
```

(Use your actual Supabase URL from `.env`)

### Step 3: Add Second Secret

```
Name: VITE_SUPABASE_ANON_KEY
Secret: eyJhbGc...
```

(Use your actual Supabase anon key from `.env`)

### Step 4: Verify

- Both secrets should appear in the list
- Names must be **exactly** as shown (case-sensitive)
- Values should match your `.env` file

## 🚨 Common Mistakes

### ❌ Wrong: Using Variables Instead of Secrets

- Variables are **visible in logs**
- Not recommended for Supabase keys (even if they're "public")

### ❌ Wrong: Wrong Variable Names

- ❌ `SUPABASE_URL` (missing `VITE_` prefix)
- ❌ `vite_supabase_url` (wrong case)
- ✅ `VITE_SUPABASE_URL` (correct)

### ❌ Wrong: Setting in Wrong Place

- Setting in **Environment secrets** but workflow doesn't specify `environment`
- Setting **Repository secrets** but using wrong names

## ✅ Verification

After setting secrets:

1. **Check workflow can access them:**

   ```yaml
   # Your workflow already uses:
   env:
     VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
   ```

   This will work with **Repository secrets** or **Environment secrets**.

2. **Test the workflow:**
   - Push to `main` branch
   - Check Actions tab
   - Look for "Build application" step
   - Should build successfully without "Missing environment variables" error

3. **Check production:**
   - Visit `https://fantasykings.bolt.host`
   - Open browser console
   - Should see: `[🔍 Supabase Env Check] VITE_SUPABASE_URL: SET`

## 🎯 Recommendation

**Use Repository Secrets** because:

- ✅ Your workflow already supports it
- ✅ Simpler setup (one place)
- ✅ Works with all workflows (CI, deploy)
- ✅ Supabase anon key is "public" anyway (safe in client code)

**Only use Environment Secrets if:**

- You want to isolate production secrets
- You have different values for dev/staging/prod
- You want extra security isolation

## 📚 Related Documentation

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
