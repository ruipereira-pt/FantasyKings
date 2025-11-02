# Content Security Policy (CSP) Configuration

## Current Status

We have added a CSP meta tag to `index.html` that provides secure defaults.

## The CSP Error You're Seeing

The error `Content Security Policy of your site blocks the use of 'eval' in JavaScript` can occur for several reasons:

### 1. **Development Mode (Expected)**

In development, Vite uses `eval()` for Hot Module Replacement (HMR). This is normal and expected. The CSP error can be safely ignored in development.

### 2. **Production Build (Unexpected)**

In production builds, Vite does NOT use `eval()`. If you see this error in production, it could be:

- A dependency using `eval()` (unlikely with modern React/Vite)
- Bolt.host's default CSP headers overriding our meta tag
- A misconfiguration

## Current CSP Configuration

Our CSP meta tag in `index.html`:

- Blocks `eval()` for security (good!)
- Allows inline scripts (`unsafe-inline`) - needed for Vite's production build
- Allows connections to HTTPS/WSS endpoints (needed for Supabase)
- Blocks `object-src` for security

## If You Need to Allow eval (NOT RECOMMENDED)

**Warning**: Allowing `eval()` significantly reduces security. Only do this if absolutely necessary and you understand the risks.

To allow `eval()` (e.g., for development or if a dependency requires it):

```html
<script-src 'self' 'unsafe-inline' 'unsafe-eval';>
```

## Checking the Source of CSP Errors

1. **Browser DevTools**:
   - Open Console → Look for CSP violation details
   - Check "Network" tab → Look at response headers for `Content-Security-Policy`

2. **Bolt.host Configuration**:
   - Bolt.host may set CSP headers that override our meta tag
   - Check Bolt.host dashboard for CSP settings
   - Meta tags have lower priority than HTTP headers

3. **Dependency Check**:
   - Most modern dependencies don't use `eval()`
   - If a dependency requires it, consider finding an alternative

## Recommended Actions

1. **For Production**: The current CSP should work fine - Vite production builds don't use eval
2. **For Development**: You can ignore the CSP eval error, or temporarily add `'unsafe-eval'` to script-src for dev only
3. **If Bolt.host has CSP headers**: Contact Bolt.host support to adjust their CSP settings, or configure it in their dashboard

## Security Notes

- **Blocking eval is GOOD** - It prevents code injection attacks
- **unsafe-inline** is needed for Vite's build output
- **unsafe-eval** should be avoided if possible
- CSP meta tags can be overridden by HTTP headers (set by Bolt.host)
