# CI/CD Pipeline Documentation

This repository uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)
Main continuous integration workflow that runs on every push and pull request.

**Jobs:**
- **Security Checks**: Runs `npm audit` to check for vulnerabilities
- **Lint & Type Check**: Runs ESLint and TypeScript type checking
- **Build**: Builds the application to ensure it compiles correctly
- **Test**: Runs automated tests with coverage reporting
- **Supabase Functions**: Checks syntax of Supabase Edge Functions
- **CI Pipeline Status**: Summary job that reports overall status

### 2. CodeQL Security Analysis (`codeql.yml`)
Advanced security scanning using GitHub's CodeQL engine.

**Features:**
- Scans JavaScript and TypeScript code
- Runs on push, PR, and weekly schedule
- Detects security vulnerabilities and code quality issues
- Uses security-and-quality queries

### 3. Security Audit (`security-audit.yml`)
Dedicated security audit workflow.

**Features:**
- Runs `npm audit` daily
- Checks for moderate, high, and critical vulnerabilities
- Generates security reports
- Comments on PRs if vulnerabilities are found

### 4. Production Deployment (`deploy.yml`)
Automated production deployment workflow.

**Features:**
- Triggers on merge to `main` branch
- Waits for CI checks to pass before deploying
- Supports multiple deployment platforms (Vercel, Netlify, GitHub Pages, AWS S3)
- Optional Supabase migrations deployment
- Post-deployment notifications

## Dependabot

Automated dependency updates are configured via `.github/dependabot.yml`:

- **npm dependencies**: Weekly updates on Mondays
- **GitHub Actions**: Weekly updates
- Groups updates by type (production/development)
- Limited to 5 open PRs at a time

## Running Locally

### Before Committing

```bash
# Run linter
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the application
npm run build
```

### Security Checks

```bash
# Check for vulnerabilities
npm audit

# Check for outdated packages
npm outdated
```

## Badges

Add these badges to your README:

```markdown
![CI/CD Pipeline](https://github.com/ruipereira-pt/FantasyKings/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/ruipereira-pt/FantasyKings/actions/workflows/codeql.yml/badge.svg)
![Security Audit](https://github.com/ruipereira-pt/FantasyKings/actions/workflows/security-audit.yml/badge.svg)
![Deploy to Production](https://github.com/ruipereira-pt/FantasyKings/actions/workflows/deploy.yml/badge.svg)
```

## Required Secrets

For the workflows to function properly, ensure these secrets are configured in GitHub:

### CI/CD Pipeline
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

### Production Deployment (choose your platform)

**Vercel:**
- `VERCEL_TOKEN`: Personal access token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

**Netlify:**
- `NETLIFY_AUTH_TOKEN`: Personal access token
- `NETLIFY_SITE_ID`: Netlify site ID

**AWS S3:**
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region
- `S3_BUCKET_NAME`: S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_ID`: (Optional) CloudFront distribution ID

**Supabase (Optional):**
- `SUPABASE_ACCESS_TOKEN`: Personal access token
- `SUPABASE_PROJECT_REF`: Project reference ID
- `SUPABASE_DB_PASSWORD`: Database password

Configure these in: **Settings → Secrets and variables → Actions**

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed setup instructions.

## Test Coverage

Test coverage reports are generated using Vitest and uploaded to Codecov. Coverage thresholds can be configured in `vitest.config.ts`.

## Troubleshooting

### Tests Failing
- Ensure all test dependencies are installed: `npm ci`
- Check that test files are in the `src/test/` directory
- Verify environment variables are set correctly

### Build Failing
- Check that all TypeScript errors are resolved
- Ensure all dependencies are up to date
- Verify that environment variables are available

### Security Checks Failing
- Review `npm audit` output for vulnerabilities
- Update vulnerable dependencies
- Use `npm audit fix` for automatic fixes (review changes)

