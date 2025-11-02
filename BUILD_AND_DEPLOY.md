# 🚀 Build and Deploy Guide

## Quick Start

### Local Build (with .env file)

```bash
# Build using your local .env file
npm run build:with-env

# Or use the script directly
./scripts/build-with-env.sh
```

This will:

1. ✅ Load environment variables from `.env`
2. ✅ Build the application
3. ✅ Output to `./dist` folder

### Full Local Deploy Script

```bash
npm run deploy:local
```

This builds and prepares everything for deployment.

## 📦 Build Options

### Option 1: Build Locally (Recommended for Testing)

```bash
# Uses your .env file automatically
npm run build:with-env
```

**When to use:**

- Testing builds locally
- Verifying environment variables are correct
- Debugging build issues

### Option 2: Standard Build (for CI/CD)

```bash
# Standard build (expects env vars in environment)
npm run build
```

**When to use:**

- GitHub Actions (uses GitHub Secrets)
- CI/CD pipelines
- When environment variables are already in the shell

## 🔄 Deployment Methods

### Method 1: GitHub Actions (Automatic)

**Setup:**

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push to `main` branch

**Deployment:**

```bash
git push origin main
```

GitHub Actions will:

1. ✅ Run CI checks
2. ✅ Build with secrets as environment variables
3. ✅ Deploy (if Bolt.host is connected via GitHub)

### Method 2: Bolt.host Dashboard (Manual)

**Setup:**

1. Go to Bolt.host Dashboard → Your Project → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
3. Mark as "Build" or "Both" scope

**Deployment:**

- Push to `main` (if GitHub integration is enabled)
- OR manually trigger deployment in dashboard

### Method 3: Build Locally and Deploy Manually

**Build:**

```bash
npm run build:with-env
```

**Deploy:**

- Upload `./dist` folder to your hosting provider
- OR use platform-specific CLI (e.g., `vercel deploy`, `netlify deploy`)

## 🔑 Environment Variables Setup

### Local Development (.env file)

Create `.env` in project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### GitHub Actions (Secrets)

1. Go to: `https://github.com/your-username/FantasyKings/settings/secrets/actions`
2. Click "New repository secret"
3. Add:
   - Name: `VITE_SUPABASE_URL`
   - Value: Your Supabase URL
4. Repeat for `VITE_SUPABASE_ANON_KEY`

### Bolt.host Dashboard

1. Dashboard → Project → Environment Variables
2. Add variables (same names as above)
3. **Critical**: Set scope to "Build" or "Both"

## ✅ Verification

### Check Build Locally

```bash
# Build
npm run build:with-env

# Preview
npm run preview

# Visit http://localhost:4173
# Check browser console for environment variable status
```

### Check Production Build

After deployment, open browser console on production site:

```
[🔍 Supabase Env Check] VITE_SUPABASE_URL: SET (length: XX)
[🔍 Supabase Env Check] VITE_SUPABASE_ANON_KEY: SET (length: XX)
```

If you see `NOT SET`, environment variables weren't available during build.

## 🐛 Troubleshooting

### Build Fails: "Missing environment variables"

**Local:**

- Check `.env` file exists and has correct variable names
- Run: `npm run build:with-env` (uses .env automatically)

**Production:**

- Verify GitHub Secrets are set (for GitHub Actions)
- Verify Bolt.host environment variables are set (for Bolt.host)
- Ensure variables are marked for "Build" scope

### Variables Not Working in Production

1. **Check variable names**: Must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. **Check scope**: Must be available during build, not just runtime
3. **Redeploy**: Variables are embedded at build time, so you must rebuild/redeploy

### Build Works Locally But Not in Production

- ✅ Local: Uses `.env` file
- ❌ Production: Needs variables in platform dashboard/secrets
- **Solution**: Set variables in GitHub Secrets OR Bolt.host dashboard

## 📚 Related Documentation

- [BOLT_HOST_SETUP.md](./BOLT_HOST_SETUP.md) - Bolt.host specific setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [ENV_VAR_TROUBLESHOOTING.md](./ENV_VAR_TROUBLESHOOTING.md) - Environment variable troubleshooting
