# Environment Variable Troubleshooting: Local vs Production

## 🔍 Why It Works Locally But Not in Production

### The Key Difference:

**Local/Development:**

- Vite dev server (`npm run dev`) reads environment variables at **server startup**
- Variables can come from:
  - `.env` files (in project root)
  - Shell environment variables
  - System environment variables
- Variables are available at **runtime**

**Production:**

- Vite **embeds** environment variables into the JavaScript bundle during **build time**
- Variables must be available when `npm run build` runs
- If variables aren't available during build, they're embedded as `undefined` or empty strings
- Variables are **statically embedded** - they cannot be changed after build

### Why Your Local Works:

1. **You have variables set in your shell/system environment**
2. **OR you have a `.env` file** (which is gitignored)
3. When you run `npm run dev`, Vite reads these variables
4. They're available throughout the dev session

### Why Production Doesn't Work:

1. **Bolt.host needs to expose variables during the build step**
2. Variables must be configured in Bolt.host **before** the build runs
3. If variables are only set for "Runtime" and not "Build", they won't be available during `npm run build`
4. The build process creates a static bundle with whatever variables were (or weren't) available

## 🔧 How to Fix

### Step 1: Check Your Local Setup

Create a `.env` file to see what you're using locally:

```bash
# Create .env file (this is gitignored, so safe to commit the structure)
cat > .env << 'EOF'
VITE_SUPABASE_URL=your-url-here
VITE_SUPABASE_ANON_KEY=your-key-here
EOF
```

### Step 2: Verify Bolt.host Configuration

In Bolt.host dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. **Critical**: Check that variables are set for **"Build"** or **"Both"** (NOT just "Runtime")
3. Verify exact variable names:
   - `VITE_SUPABASE_URL` (case-sensitive)
   - `VITE_SUPABASE_ANON_KEY` (case-sensitive)
4. Verify values are correct (no extra spaces, quotes, etc.)

### Step 3: Test the Build Locally

Test if variables work during build:

```bash
# Export variables in your shell
export VITE_SUPABASE_URL="your-url"
export VITE_SUPABASE_ANON_KEY="your-key"

# Build and check the output
npm run build

# Check if variables are in the bundle
grep -o "VITE_SUPABASE_URL" dist/assets/*.js | head -1
```

If variables are missing, the build will embed `undefined`.

### Step 4: Verify Production Build Logs

Check Bolt.host build logs for:

- Environment variables being loaded
- Any errors during build
- Confirmation that build completes successfully

## 📊 Diagnostic Commands

### Check What's Available Locally:

```bash
# In your terminal
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Or in Node.js
node -e "console.log(process.env.VITE_SUPABASE_URL)"
```

### Check What's in Production Bundle:

After deploying, open browser console and run:

```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log(
  'All VITE_ vars:',
  Object.keys(import.meta.env).filter((k) => k.startsWith('VITE_'))
);
```

## ⚠️ Common Mistakes:

1. **Variables only set for "Runtime"** - They need to be available during build
2. **Wrong variable names** - Must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Variables set after build** - Too late! Variables are embedded during build
4. **Typo in variable names** - Case-sensitive, check spelling
5. **Old deployment** - Previous build had missing variables, needs redeploy

## ✅ Solution Checklist:

- [ ] Variables are set in Bolt.host dashboard
- [ ] Variables are marked for "Build" or "Both"
- [ ] Variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Variables are set BEFORE triggering build
- [ ] New deployment was triggered after setting variables
- [ ] Build logs show variables being loaded
- [ ] Production console shows variables are SET (check browser console)
