# 🚀 Automatic Deployment on PR Merge

## ✅ Current Setup

Your deployment workflow is **already configured** to automatically deploy when a PR is merged to `main`!

### How It Works:

1. **PR Merged** → Push to `main` branch
2. **CI Runs** → GitHub Actions runs CI pipeline (lint, test, build)
3. **Deploy Workflow Triggers** → Waits for CI to pass
4. **Builds Application** → Uses repository secrets you just added
5. **Ready for Deployment** → Build artifacts created in `./dist`

## 📋 Deployment Flow

```
PR Merged to main
    ↓
GitHub Actions: CI Pipeline
    ↓ (waits for success)
GitHub Actions: Deploy Workflow
    ↓
Build with Secrets
    ↓
✅ Production Deployment
```

## 🔧 What Happens Automatically

### When You Merge a PR to `main`:

1. **`.github/workflows/deploy.yml`** triggers automatically
2. Waits for CI pipeline to pass (`wait-for-ci` job)
3. Builds application with your repository secrets:
   - `VITE_SUPABASE_URL` ✅
   - `VITE_SUPABASE_ANON_KEY` ✅
4. Creates build artifacts in `./dist`
5. Verifies build was successful

### Bolt.host Integration:

**Option A: Auto-Deploy (if GitHub integration is enabled)**

- Bolt.host automatically detects push to `main`
- Deploys the latest code
- **⚠️ Note**: Ensure environment variables are also set in Bolt.host dashboard

**Option B: Manual Deploy**

- Build artifacts are saved as GitHub Actions artifacts
- Download and upload to Bolt.host manually if needed

## ✅ Verification Steps

### 1. Check Secrets Are Set

Go to: `https://github.com/ruipereira-pt/FantasyKings/settings/secrets/actions`

You should see:

- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

### 2. Test the Workflow

1. Create a test PR (or use existing PR #19)
2. Merge it to `main`
3. Go to **Actions** tab in GitHub
4. Watch the deployment workflow run

### 3. Verify Deployment

After workflow completes:

1. **Check Actions Logs**:
   - Should see: "✅ Build completed successfully"
   - Should see: "✅ Build artifacts verified"

2. **Check Production Site**:
   - Visit: `https://fantasykings.bolt.host`
   - Open browser console
   - Should see: `[🔍 Supabase Env Check] VITE_SUPABASE_URL: SET`

## 🔍 Troubleshooting

### Build Fails: "Missing environment variables"

**Solution:**

- Verify secrets are set in GitHub repository secrets
- Check secret names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Ensure secrets have values (not empty)

### Build Succeeds But Production Still Shows Error

**Solution:**

- Bolt.host may need environment variables in its dashboard too
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Bolt.host dashboard
- Trigger a new deployment in Bolt.host

### Deployment Doesn't Trigger

**Check:**

1. Did you merge to `main` branch? (not just push)
2. Did CI pipeline pass? (deploy waits for CI)
3. Check Actions tab for any errors

## 🎯 Next Steps

### Immediate Actions:

1. ✅ **Secrets are set** (you already did this!)
2. 🔄 **Test deployment**: Merge a PR to `main` or push directly to `main`
3. 👀 **Monitor**: Watch Actions tab for deployment status
4. ✅ **Verify**: Check production site after deployment

### Recommended:

- **Set Bolt.host environment variables** too (even though GitHub Actions builds with secrets, Bolt.host might need them if it rebuilds)
- **Monitor first deployment** to ensure everything works
- **Set up notifications** (optional) to get alerts when deployments complete

## 📊 Workflow Status

Your deployment workflow will:

- ✅ **Trigger** on merge to `main`
- ✅ **Wait** for CI to pass
- ✅ **Build** with repository secrets
- ✅ **Create** deployment artifacts
- ✅ **Ready** for Bolt.host deployment

## 🔗 Related Files

- `.github/workflows/deploy.yml` - Deployment workflow
- `.github/workflows/ci.yml` - CI pipeline (runs first)
- `BOLT_HOST_SETUP.md` - Bolt.host specific setup

---

**🎉 You're all set!** The next time you merge a PR to `main`, it will automatically build and be ready for deployment!
