# Bolt.host Production Setup

## 🔴 Current Issue: Missing Environment Variables

Your production site at **https://fantasykings.bolt.host** is showing:

```
Uncaught Error: Missing Supabase environment variables
```

This happens because Vite requires environment variables to be available **during the build process**.

## ✅ Quick Fix

Your app uses **Vite's standard naming convention** - all environment variables must be prefixed with `VITE_`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### If You Need to Set Them Up

1. Log into [Bolt.host Dashboard](https://bolt.host/dashboard)
2. Find your **FantasyKings** project
3. Go to **Project Settings** → **Environment Variables** (or **Build Settings**)
4. Add these variables with the **exact** names:

| Variable Name            | Value                         | Notes                          |
| ------------------------ | ----------------------------- | ------------------------------ |
| `VITE_SUPABASE_URL`      | Your Supabase Project URL     | Must start with `VITE_` prefix |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Must start with `VITE_` prefix |

**To get your Supabase credentials:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your FantasyKings project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon public** key → Use as `VITE_SUPABASE_ANON_KEY`

### Step 3: Trigger a New Deployment

After adding the environment variables:

- **Option A**: Push a new commit to `main` branch
- **Option B**: Manually trigger a redeploy in Bolt.host dashboard

### Step 4: Verify

1. Wait for deployment to complete
2. Visit https://fantasykings.bolt.host
3. The error should be gone and the app should work correctly

## 📝 Important Notes

- ✅ **Must use `VITE_` prefix** - This is Vite's standard requirement
- ✅ Variables are embedded at **build time**, not runtime
- ✅ You must redeploy after adding/changing variables
- ✅ Double-check for typos in variable names
- ✅ Variable names are case-sensitive

## 🔍 Troubleshooting

### Still seeing the error?

1. **Check variable names**: Must be exactly:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - **Note**: The `VITE_` prefix is required - Vite only exposes variables with this prefix

2. **Check values**:
   - Ensure no extra spaces or quotes
   - URL should start with `https://`
   - Anon key should be a long string

3. **Verify deployment**:
   - Make sure the latest deployment includes the variables
   - **Important**: Variables must be available during BUILD, not just runtime
   - Bolt.host needs to expose these to the build process

4. **Check Bolt.host logs**:
   - Look for build errors in deployment logs
   - Check if variables are being loaded during `npm run build`

### How to verify variables are set in Bolt.host:

1. Go to Bolt.host dashboard → Your project → Environment Variables
2. Verify both variables are listed (names and values are present)
3. **Critical**: Make sure the variables are marked for "Build" or "Both" (not just "Runtime")
4. If Bolt.host has a separate "Build Environment Variables" section, add them there too

### If variables still don't work:

1. **Verify VITE\_ prefix**:
   - Variables **must** be named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Vite only exposes environment variables that start with `VITE_`

2. **Check build logs for errors**:
   - Look for messages about environment variables
   - Verify the build completes successfully

3. **Contact Bolt.host support**:
   - Ask how to ensure environment variables are available during build
   - Verify their build process exposes `process.env` variables to Vite

### Debug steps:

Open browser console on your production site and look for:

- `[Supabase Error]` messages showing which variables are available
- Any console errors mentioning Supabase

The error will list all available Supabase-related environment variables to help diagnose the issue.

## 🔐 Security

- Never commit environment variables to your repository
- The `anon` key is safe to use in frontend code (it's public)
- Never expose your `service_role` key in frontend code

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Getting Started](https://supabase.com/docs/guides/getting-started)
- [Bolt.host Documentation](https://docs.bolt.host)
