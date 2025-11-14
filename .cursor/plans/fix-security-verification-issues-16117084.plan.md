<!-- 16117084-76c1-4259-8d3f-63ea64156717 a84dba1f-0162-4b51-8c35-84b8a5b864db -->
# Fix Security Verification Issues

## Analysis Summary

The security verification script identified 3 categories of warnings:

1. **Check #2 - "Exposed API keys"**: False positives - script flags legitimate `process.env.*API.*KEY` usage
2. **Check #3 - "Sensitive data in logs"**: Real issues - some logs expose API key prefixes or should be development-only
3. **Check #9 - "Dependency vulnerabilities"**: Moderate severity `js-yaml` vulnerability in Jest dev dependencies

## Implementation Plan

### 1. Improve Security Script Accuracy (verify-security.sh)

**Issue**: Check #2 flags legitimate environment variable access as "exposed API keys"

**Solution**: Refine the grep pattern to exclude:

- Variable assignments (`= process.env.*`)
- Conditional checks (`if (!process.env.*)`, `!!process.env.*`)
- Type annotations and interfaces
- Only flag actual hardcoded keys or suspicious patterns

**Files to modify**:

- `scripts/verify-security.sh` (lines 46-56)

### 2. Fix Sensitive Data Logging

**2a. Remove API Key Prefix Logging** (perplexity-research.ts)

- **Issue**: Logs first 8 characters of API key which could be used for identification
- **Fix**: Remove `keyPrefix` from log output, keep only boolean status
- **File**: `src/lib/services/perplexity-research.ts` (line 94-99)

**2b. Make Debug Logs Development-Only** (conflict-analysis.ts)

- **Issue**: Production debug logs showing API key availability
- **Fix**: Wrap console.log statements in `NODE_ENV === 'development'` check
- **File**: `src/lib/services/conflict-analysis.ts` (lines 689-702)

**2c. Make Route Logging Development-Only** (ticketmaster route)

- **Issue**: Logs request parameters in production
- **Fix**: Add `NODE_ENV === 'development'` check
- **File**: `src/app/api/analyze/events/ticketmaster/route.ts` (line 106)

**2d. Exclude Test File from Security Check** (check-env.ts)

- **Issue**: Test utility file flagged for logging env var status
- **Fix**: Update security script to exclude test/debug files, OR add comment to exclude this file
- **Files**: 
- `scripts/verify-security.sh` (line 61) - add exclusion pattern
- Optionally: Add `.security-ignore` comment to `check-env.ts`

### 3. Address Dependency Vulnerabilities

**Issue**: 18 moderate severity vulnerabilities in `js-yaml <4.1.1` (prototype pollution vulnerability - GHSA-mh29-5h37-fv8m)

**Details**:

- All vulnerabilities are in **dev dependencies only** (Jest testing framework)
- Vulnerability chain: `js-yaml` → `@istanbuljs/load-nyc-config` → `babel-plugin-istanbul` → `@jest/transform` → `@jest/core` → `jest` → `ts-jest`
- Not a production runtime risk, but should be fixed for security best practices

**Solution Options**:

- **Option A**: Run `npm audit fix` (non-breaking fixes first)
- If this doesn't resolve all issues, proceed to Option B
- **Option B**: Run `npm audit fix --force` (will install `ts-jest@29.1.2` - breaking change)
- Requires thorough testing of Jest test suite
- May require updating test configurations
- **Option C**: Manually update Jest/ts-jest to latest compatible versions
- Check compatibility with current Next.js/TypeScript versions
- More controlled but time-consuming

**Recommended Approach**:

1. First try `npm audit fix` (non-breaking)
2. If vulnerabilities remain, try `npm audit fix --force`
3. Run full test suite: `npm test` (if available) or verify Jest still works
4. If tests fail, manually update Jest/ts-jest versions in package.json
5. Document any breaking changes in changelog

## Files to Modify

1. `scripts/verify-security.sh` - Improve API key detection accuracy and exclude test files
2. `src/lib/services/perplexity-research.ts` - Remove key prefix from logs
3. `src/lib/services/conflict-analysis.ts` - Make debug logs development-only
4. `src/app/api/analyze/events/ticketmaster/route.ts` - Make request logging development-only
5. `package.json` / `package-lock.json` - Update dependencies (if audit fix works)

## Testing

After changes:

1. Run `npm run security-check` - should show reduced/fixed warnings
2. Run `npm run lint` - ensure no new linting issues
3. Run `npm run type-check` - ensure TypeScript still compiles
4. Test affected services in development mode - verify logs still work
5. Test in production mode - verify sensitive logs are suppressed

### To-dos

- [ ] Refine verify-security.sh API key detection to exclude legitimate env var usage (assignments, conditionals)
- [ ] Update security script to exclude test/debug files from sensitive log detection
- [ ] Remove API key prefix logging from perplexity-research.ts (line 97)
- [ ] Wrap debug logs in conflict-analysis.ts with NODE_ENV development check
- [ ] Add NODE_ENV check to ticketmaster route request parameter logging
- [ ] Run npm audit fix and test, or manually update Jest dependencies to resolve js-yaml vulnerability