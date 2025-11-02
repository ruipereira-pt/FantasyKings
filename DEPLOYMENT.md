# Deployment Guide

This guide explains how to configure production deployments that trigger automatically after merging to `main`.

## 🚀 Deployment Workflow

The deployment workflow (`.github/workflows/deploy.yml`) automatically:
1. ✅ Waits for CI checks to pass
2. ✅ Builds the application
3. ✅ Deploys to your chosen platform
4. ✅ Optionally deploys Supabase migrations

## 📋 Deployment Options

### Option 1: Vercel (Recommended for Vite/React)

**Setup:**
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`
4. Get your credentials:
   - `vercel inspect` to get Project ID
   - Find Org ID in Vercel dashboard

**GitHub Secrets Required:**
- `VERCEL_TOKEN`: Personal access token from Vercel
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

**To get VERCEL_TOKEN:**
1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Copy and add to GitHub Secrets

### Option 2: Netlify

**Setup:**
1. Create a Netlify site
2. Get Site ID from site settings

**GitHub Secrets Required:**
- `NETLIFY_AUTH_TOKEN`: Personal access token from Netlify
- `NETLIFY_SITE_ID`: Your Netlify site ID

**To get NETLIFY_AUTH_TOKEN:**
1. Go to https://app.netlify.com/user/applications/personal
2. Create a new access token
3. Copy and add to GitHub Secrets

### Option 3: GitHub Pages

**Setup:**
1. Enable GitHub Pages in repository settings
2. Set source branch to `gh-pages`

**Environment Variable:**
- Set `DEPLOY_TO_GH_PAGES: 'true'` in workflow (edit `.github/workflows/deploy.yml`)

**Custom Domain:**
- Update `cname` in the workflow file
- Add CNAME file in your repository

### Option 4: AWS S3 + CloudFront

**GitHub Secrets Required:**
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (e.g., `us-east-1`)
- `S3_BUCKET_NAME`: S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_ID`: (Optional) CloudFront distribution ID

**Environment Variable:**
- Set `DEPLOY_TO_S3: 'true'` in workflow

### Option 5: Custom/Manual Deployment

If you prefer manual deployment or a different platform:

1. The workflow will build the app and upload artifacts
2. Download artifacts from the Actions run
3. Deploy manually to your platform

## 🔧 Configuration Steps

### 1. Choose Your Deployment Platform

Edit `.github/workflows/deploy.yml` and uncomment/configure the deployment method you want to use.

### 2. Add Required Secrets

Go to: **Settings → Secrets and variables → Actions**

Add the secrets for your chosen platform (see above).

### 3. Configure Environment Variables

For all deployment methods, ensure these are set:
- `VITE_SUPABASE_URL`: Already configured
- `VITE_SUPABASE_ANON_KEY`: Already configured

### 4. Supabase Deployment (Optional)

If you want automatic Supabase migrations:

**Secrets Required:**
- `SUPABASE_ACCESS_TOKEN`: Personal access token from Supabase
- `SUPABASE_PROJECT_REF`: Your Supabase project reference ID
- `SUPABASE_DB_PASSWORD`: Database password

**To get SUPABASE_ACCESS_TOKEN:**
1. Go to https://supabase.com/dashboard/account/tokens
2. Generate a new access token
3. Copy and add to GitHub Secrets

**To get SUPABASE_PROJECT_REF:**
1. Go to your Supabase project settings
2. Find "Reference ID" in project settings
3. Copy and add to GitHub Secrets

## 🔄 How It Works

### Automatic Deployment Flow

```
Merge to main
    ↓
CI Pipeline runs
    ↓
Wait for CI to pass ✅
    ↓
Build application
    ↓
Deploy to production 🚀
    ↓
Deploy Supabase migrations (optional)
    ↓
Post-deployment notifications
```

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## 🛡️ Safety Features

1. **CI Gate**: Deployment only happens after CI checks pass
2. **Environment Protection**: Uses GitHub Environments (configure in Settings)
3. **Build Artifacts**: Build is saved as artifact for debugging
4. **Rollback**: Use previous deployment if needed (platform-specific)

## 📊 Monitoring Deployments

### View Deployment Status

- Go to **Actions** tab
- Click on the latest workflow run
- Check deployment job status

### Deployment History

- GitHub Actions shows all deployment runs
- Each run includes build artifacts
- View logs for debugging

## 🔍 Troubleshooting

### Deployment Fails

1. **Check CI Status**: Ensure CI pipeline passed
2. **Check Secrets**: Verify all required secrets are set
3. **Check Logs**: View workflow logs for error messages
4. **Test Locally**: Run `npm run build` locally to catch build errors

### Build Errors

```bash
# Test build locally
npm ci
npm run build

# Check for TypeScript errors
npm run typecheck

# Check for linting errors
npm run lint
```

### Environment Variables Not Available

- Ensure secrets are set in GitHub repository settings
- Check that environment variables are correctly referenced in workflow
- Verify build output includes environment variables (check build logs)

## 📝 Example Workflow Configurations

### Vercel Only

Use `.github/workflows/deploy-vercel.yml.example` as a template:

1. Copy to `.github/workflows/deploy-vercel.yml`
2. Configure Vercel secrets
3. Remove or disable main `deploy.yml` if using this

### Netlify Only

Use `.github/workflows/deploy-netlify.yml.example` as a template:

1. Copy to `.github/workflows/deploy-netlify.yml`
2. Configure Netlify secrets
3. Remove or disable main `deploy.yml` if using this

## 🎯 Best Practices

1. **Always test locally first**: Run `npm run build` before pushing
2. **Use preview deployments**: Many platforms offer preview URLs for PRs
3. **Monitor deployments**: Set up notifications for failed deployments
4. **Version control**: Tag releases after successful deployments
5. **Rollback plan**: Know how to rollback if needed

## 🔐 Security

- Never commit secrets to repository
- Use GitHub Secrets for all sensitive data
- Rotate tokens regularly
- Use environment protection rules in GitHub
- Limit access to deployment secrets

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)

