# Vercel Deployment Configuration

## 🎯 Configure Vercel to Deploy Only on Merge to Main

By default, Vercel creates preview deployments for every pull request. To deploy **only** when PRs are merged to `main`:

### Option 1: Vercel Dashboard Settings (Recommended)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Git**
2. Under **Production Branch**:
   - Set **Production Branch** to: `main`
3. Under **Deploy Hooks** or **GitHub Integration**:
   - **Disable** "Automatic deployments from pull requests"
   - Or set it to **Production deployments only**

### Option 2: Disable Preview Deployments

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Git**
2. Find **Pull Request Comments** or **Preview Deployments**
3. **Disable** preview deployments
4. Enable **Production deployments only**

### Option 3: Ignore Pattern (Alternative)

If you want to keep previews but ensure only `main` triggers production:

1. Vercel Dashboard → Settings → **Git**
2. Set **Production Branch**: `main`
3. Set **Ignored Build Step**: Only build for production branch

## ✅ Current Configuration

The `vercel.json` file has been configured with:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
}
```

However, **the main setting must be configured in Vercel Dashboard**:

### Steps to Configure:

1. **Vercel Dashboard** → Your Project → **Settings** → **Git**
2. **Production Branch**: Set to `main`
3. **Pull Request Deployments**:
   - Option A: Disable completely (no previews)
   - Option B: Enable but set to "Preview only" (not production)

### Recommended Setting:

- ✅ **Production Branch**: `main`
- ✅ **Pull Request Deployments**: **Disabled** (deploy only on merge to main)
- ✅ **Automatic deployments from Git**: **Enabled** (for main branch)

## 🔧 How It Works

### Current Behavior (if configured correctly):

```
PR Opened
    ↓
Vercel: ❌ No deployment (if previews disabled)
    OR
Vercel: 🔍 Preview deployment only (if previews enabled)

PR Merged to main
    ↓
Vercel: ✅ Production deployment triggered
```

### Environment Variables

Make sure these are set in **Vercel Dashboard** → **Settings** → **Environment Variables**:

- `VITE_SUPABASE_URL` (Production)
- `VITE_SUPABASE_ANON_KEY` (Production)

## 📝 Verification

After configuration:

1. Create a test PR
2. Check Vercel dashboard - should see:
   - ❌ No deployment, OR
   - 🔍 Preview deployment (not production)
3. Merge PR to `main`
4. Check Vercel dashboard - should see:
   - ✅ Production deployment triggered

## 🔗 Resources

- [Vercel Git Integration Settings](https://vercel.com/docs/concepts/git)
- [Vercel Production Branch Configuration](https://vercel.com/docs/concepts/git#production-branch)
