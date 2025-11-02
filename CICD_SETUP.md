# CI/CD Pipeline Setup Summary

This document describes the CI/CD pipeline that has been set up for the FantasyKings project.

## 🚀 Overview

The CI/CD pipeline includes:
- **Security Checks**: npm audit, CodeQL analysis, dependency vulnerability scanning
- **Static Code Analysis**: ESLint, TypeScript type checking
- **Automated Testing**: Vitest with coverage reporting
- **Build Verification**: Ensures the application compiles correctly
- **Pre-commit Hooks**: Local validation before commits

## 📋 Workflows Created

### 1. Main CI/CD Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- ✅ **Security Checks**: npm audit for vulnerabilities
- ✅ **Lint & Type Check**: ESLint and TypeScript validation
- ✅ **Build**: Compiles the application
- ✅ **Test**: Runs automated tests with coverage
- ✅ **Supabase Functions**: Validates Edge Functions syntax
- ✅ **Summary**: Reports overall pipeline status

### 2. CodeQL Security Analysis (`.github/workflows/codeql.yml`)

Advanced security scanning using GitHub's CodeQL engine.

- Scans JavaScript and TypeScript code
- Runs on push, PR, and weekly schedule
- Detects security vulnerabilities and code quality issues

### 3. Security Audit (`.github/workflows/security-audit.yml`)

Dedicated daily security audit workflow.

- Runs npm audit daily at 02:00 UTC
- Checks for vulnerabilities
- Comments on PRs if issues found
- Generates security reports

### 4. Dependabot (`.github/dependabot.yml`)

Automated dependency management.

- Updates npm dependencies weekly
- Updates GitHub Actions weekly
- Limits to 5 open PRs
- Groups updates by type

## 🧪 Testing Setup

### Testing Framework: Vitest

- **Location**: `src/test/`
- **Configuration**: `vitest.config.ts`
- **Test Files**: `*.test.ts` and `*.test.tsx`

### Sample Tests Created

1. `src/test/utils.test.ts` - Basic utility function tests
2. `src/test/components/Layout.test.tsx` - Component test example
3. `src/test/setup.ts` - Test setup and mocks

### Running Tests

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## 🔒 Security Features

### Automated Security Checks

1. **npm audit**: Checks for known vulnerabilities in dependencies
2. **CodeQL**: Deep code analysis for security patterns
3. **Dependency Scanning**: Monitors for outdated packages

### Pre-commit Security

Pre-commit hooks ensure code quality before commits:
- ESLint checks on staged files
- Prettier formatting on JSON/Markdown files

## 📦 New Dependencies Added

### Testing
- `vitest`: Test runner
- `@vitest/coverage-v8`: Coverage reporting
- `@testing-library/react`: React component testing
- `@testing-library/jest-dom`: DOM matchers
- `@testing-library/user-event`: User interaction simulation
- `jsdom`: DOM environment for tests

### Development Tools
- `husky`: Git hooks
- `lint-staged`: Run linters on staged files
- `prettier`: Code formatting

## 🛠️ Configuration Files

1. **`.github/workflows/ci.yml`**: Main CI/CD pipeline
2. **`.github/workflows/codeql.yml`**: CodeQL security analysis
3. **`.github/workflows/security-audit.yml`**: Security audit workflow
4. **`.github/dependabot.yml`**: Dependency updates
5. **`vitest.config.ts`**: Test configuration
6. **`.lintstagedrc.json`**: Pre-commit linting rules
7. **`.prettierrc.json`**: Code formatting rules
8. **`.husky/pre-commit`**: Pre-commit hook script

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will automatically set up Husky hooks.

### 2. Configure GitHub Secrets

In GitHub repository settings, add these secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Location**: Settings → Secrets and variables → Actions

### 3. Enable CodeQL (Optional)

CodeQL should work automatically, but you can view results in:
- **Security tab** → **Code scanning alerts**

### 4. Enable Dependabot

Dependabot is configured via `.github/dependabot.yml` and will:
- Automatically create PRs for dependency updates
- Run weekly on Mondays at 09:00 UTC

## 📊 Monitoring

### Workflow Status

View workflow runs in:
- **Actions tab** in GitHub repository

### Badges

Add these badges to your README:

```markdown
![CI/CD Pipeline](https://github.com/ruipereira-pt/FantasyKings/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/ruipereira-pt/FantasyKings/actions/workflows/codeql.yml/badge.svg)
![Security Audit](https://github.com/ruipereira-pt/FantasyKings/actions/workflows/security-audit.yml/badge.svg)
```

## 🚦 Pipeline Status

The pipeline has different severity levels:

- **Critical** (must pass):
  - Security checks
  - Lint and type check
  - Build

- **Warning** (informational):
  - Tests (if not passing, warns but doesn't fail)
  - Supabase functions check

## 📝 Next Steps

1. **Add More Tests**: Expand test coverage for components and utilities
2. **Configure Coverage Thresholds**: Set minimum coverage requirements in `vitest.config.ts`
3. **Add E2E Tests**: Consider adding Playwright or Cypress for end-to-end testing
4. **Review Security Reports**: Regularly check security audit results
5. **Monitor Dependabot PRs**: Review and merge dependency updates regularly

## 🔍 Troubleshooting

### Tests Not Running
- Ensure all dependencies are installed: `npm ci`
- Check that test files are named correctly (`*.test.ts` or `*.test.tsx`)
- Verify `vitest.config.ts` is configured correctly

### Pre-commit Hooks Not Working
```bash
# Reinstall husky
npm run prepare
```

### Build Failing in CI
- Check environment variables are set correctly
- Verify TypeScript errors are resolved
- Ensure all dependencies are listed in `package.json`

### Security Checks Failing
- Run `npm audit` locally to see issues
- Use `npm audit fix` for automatic fixes (review changes)
- For major vulnerabilities, update packages manually

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)

