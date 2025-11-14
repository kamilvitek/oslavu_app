#!/bin/bash
# Security Verification Script
# Verifies that all security implementations are correct

set -e

echo "🔍 Running security verification..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# 1. Type checking
echo "1. Type checking..."
if npm run type-check > /dev/null 2>&1; then
    success "TypeScript type checking passed"
else
    error "TypeScript type checking failed"
    echo "   Run 'npm run type-check' for details"
fi
echo ""

# 2. Check for exposed API keys in code
echo "2. Checking for exposed API keys..."
EXPOSED_KEYS=$(grep -r "process.env.*API.*KEY" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "NEXT_PUBLIC" | grep -v "//" | grep -v "console.log" | grep -v "console.warn" | grep -v "console.error" || true)
if [ -z "$EXPOSED_KEYS" ]; then
    success "No exposed API keys found"
else
    warning "Potential API key exposure found:"
    echo "$EXPOSED_KEYS" | while read line; do
        echo "   $line"
    done
fi
echo ""

# 3. Check for sensitive data in console logs
echo "3. Checking for sensitive data in logs..."
SENSITIVE_LOGS=$(grep -r "console.log.*key\|console.log.*secret\|console.log.*password\|console.log.*token" src/ --include="*.ts" --include="*.tsx" -i 2>/dev/null | grep -v "NODE_ENV" | grep -v "development" || true)
if [ -z "$SENSITIVE_LOGS" ]; then
    success "No sensitive data logging found"
else
    warning "Potential sensitive data logging found:"
    echo "$SENSITIVE_LOGS" | while read line; do
        echo "   $line"
    done
fi
echo ""

# 4. Check for security headers middleware
echo "4. Checking security headers middleware..."
if [ -f "src/middleware.ts" ]; then
    if grep -q "X-Frame-Options" src/middleware.ts && grep -q "Content-Security-Policy" src/middleware.ts; then
        success "Security headers middleware found and configured"
    else
        error "Security headers middleware missing required headers"
    fi
else
    error "Security headers middleware file not found"
fi
echo ""

# 5. Check for rate limiting implementation
echo "5. Checking rate limiting implementation..."
if [ -f "src/lib/utils/rate-limiting.ts" ]; then
    if grep -q "withRateLimit" src/lib/utils/rate-limiting.ts; then
        success "Rate limiting utility found"
    else
        error "Rate limiting utility missing withRateLimit function"
    fi
else
    error "Rate limiting utility file not found"
fi
echo ""

# 6. Check for authentication utilities
echo "6. Checking authentication utilities..."
if [ -f "src/lib/utils/auth.ts" ]; then
    if grep -q "verifyApiKey\|verifyBearerToken" src/lib/utils/auth.ts; then
        success "Authentication utilities found"
    else
        error "Authentication utilities missing required functions"
    fi
else
    error "Authentication utilities file not found"
fi
echo ""

# 7. Check for error sanitization
echo "7. Checking error handling..."
if [ -f "src/lib/utils/error-handling.ts" ]; then
    if grep -q "NODE_ENV.*development" src/lib/utils/error-handling.ts && grep -q "sanitizeLogData" src/lib/utils/error-handling.ts; then
        success "Error sanitization implemented"
    else
        warning "Error sanitization may be incomplete"
    fi
else
    error "Error handling file not found"
fi
echo ""

# 8. Check for CORS configuration
echo "8. Checking CORS configuration..."
CORS_WILDCARD=$(grep -r "Access-Control-Allow-Origin.*\*" src/app/api/ --include="*.ts" 2>/dev/null | grep -v "ALLOWED_ORIGIN" || true)
if [ -z "$CORS_WILDCARD" ]; then
    success "CORS properly configured (no wildcard found)"
else
    warning "Potential CORS wildcard found:"
    echo "$CORS_WILDCARD" | while read line; do
        echo "   $line"
    done
fi
echo ""

# 9. Check for dependency vulnerabilities
echo "9. Checking dependency vulnerabilities..."
if npm audit --audit-level=moderate > /dev/null 2>&1; then
    success "No moderate or high severity vulnerabilities found"
else
    warning "Dependency vulnerabilities found"
    echo "   Run 'npm audit' for details"
fi
echo ""

# Summary
echo "=========================================="
echo "Verification Summary:"
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "All security checks passed!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    warning "$WARNINGS warning(s) found (non-critical)"
    exit 0
else
    error "$ERRORS error(s) and $WARNINGS warning(s) found"
    exit 1
fi

