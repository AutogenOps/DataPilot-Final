#!/usr/bin/env bash
# Quick verification script for MCP tools in production
# Usage: ./verify_mcp_production.sh <deployment_url>
# Example: ./verify_mcp_production.sh https://your-app.vercel.app

if [ -z "$1" ]; then
    echo "Usage: $0 <deployment_url>"
    echo "Example: $0 https://your-app.vercel.app"
    exit 1
fi

URL=$1
FAILED=0

echo "🔍 Verifying MCP Tools in Production"
echo "📍 URL: $URL"
echo ""

# Test 1: Health check
echo -n "✓ Testing health endpoint... "
HEALTH=$(curl -s "$URL/api/health")
if echo "$HEALTH" | grep -q '"ok":true'; then
    echo "✓"
else
    echo "✗ FAILED"
    echo "Response: $HEALTH"
    FAILED=$((FAILED + 1))
fi

# Test 2: MCP Tools list
echo -n "✓ Fetching MCP tools list... "
TOOLS=$(curl -s "$URL/api/mcp/tools")
if echo "$TOOLS" | grep -q '"ok":true'; then
    echo "✓"
    TOOL_COUNT=$(echo "$TOOLS" | grep -o '"count":[0-9]*' | cut -d: -f2)
    echo "  Found $TOOL_COUNT tools"
    
    if [ "$TOOL_COUNT" -ne 12 ]; then
        echo "  ⚠ Expected 12 tools, got $TOOL_COUNT"
        FAILED=$((FAILED + 1))
    fi
else
    echo "✗ FAILED"
    echo "Response: $TOOLS"
    FAILED=$((FAILED + 1))
fi

# Test 3: MCP Config
echo -n "✓ Fetching MCP config... "
CONFIG=$(curl -s "$URL/api/mcp/config")
if echo "$CONFIG" | grep -q '"ok":true'; then
    echo "✓"
    SERVER_NAME=$(echo "$CONFIG" | grep -o '"mcp_server_name":"[^"]*"' | cut -d'"' -f4)
    echo "  Server: $SERVER_NAME"
else
    echo "✗ FAILED"
    echo "Response: $CONFIG"
    FAILED=$((FAILED + 1))
fi

# Test 4: Databricks validation
echo -n "✓ Testing Databricks connection... "
DB_VALIDATE=$(curl -s "$URL/api/databricks/validate")
if echo "$DB_VALIDATE" | grep -q '"ok"'; then
    echo "✓"
else
    echo "✗ FAILED or INCOMPLETE CONFIG"
    echo "Response: $DB_VALIDATE"
fi

# Test 5: Sample tool - jobs list
echo -n "✓ Testing jobs endpoint... "
JOBS=$(curl -s "$URL/api/jobs")
if echo "$JOBS" | grep -q '"ok"'; then
    echo "✓"
else
    echo "✗ FAILED"
    echo "Response: $JOBS"
    FAILED=$((FAILED + 1))
fi

# Test 6: Sample tool - pipelines list
echo -n "✓ Testing pipelines endpoint... "
PIPELINES=$(curl -s "$URL/api/pipelines")
if echo "$PIPELINES" | grep -q '"ok"'; then
    echo "✓"
else
    echo "✗ FAILED"
    echo "Response: $PIPELINES"
    FAILED=$((FAILED + 1))
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo "✅ All checks passed! MCP tools are working in production."
    exit 0
else
    echo "❌ Some checks failed ($FAILED). Review the output above."
    exit 1
fi
