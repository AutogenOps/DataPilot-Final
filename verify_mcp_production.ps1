# Quick verification script for MCP tools in production (Windows)
# Usage: .\verify_mcp_production.ps1 -Url "https://your-app.vercel.app"
# Example: .\verify_mcp_production.ps1 -Url "https://your-app.vercel.app"

param(
    [Parameter(Mandatory=$true)]
    [string]$Url
)

Write-Host "🔍 Verifying MCP Tools in Production" -ForegroundColor Cyan
Write-Host "📍 URL: $Url" -ForegroundColor Gray
Write-Host ""

$failed = 0

# Test 1: Health check
Write-Host -NoNewline "✓ Testing health endpoint... "
try {
    $health = Invoke-WebRequest -Uri "$Url/api/health" -UseBasicParsing -TimeoutSec 10
    if ($health.Content -like '*"ok":true*') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "Response: $($health.Content)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "✗ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 2: MCP Tools list
Write-Host -NoNewline "✓ Fetching MCP tools list... "
try {
    $toolsResponse = Invoke-WebRequest -Uri "$Url/api/mcp/tools" -UseBasicParsing -TimeoutSec 10
    if ($toolsResponse.Content -like '*"ok":true*') {
        Write-Host "✓" -ForegroundColor Green
        
        $tools = $toolsResponse.Content | ConvertFrom-Json
        $toolCount = $tools.count
        Write-Host "  Found $toolCount tools" -ForegroundColor Gray
        
        if ($toolCount -ne 12) {
            Write-Host "  ⚠ Expected 12 tools, got $toolCount" -ForegroundColor Yellow
            $failed++
        }
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "Response: $($toolsResponse.Content)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "✗ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 3: MCP Config
Write-Host -NoNewline "✓ Fetching MCP config... "
try {
    $configResponse = Invoke-WebRequest -Uri "$Url/api/mcp/config" -UseBasicParsing -TimeoutSec 10
    if ($configResponse.Content -like '*"ok":true*') {
        Write-Host "✓" -ForegroundColor Green
        
        $config = $configResponse.Content | ConvertFrom-Json
        Write-Host "  Server: $($config.mcp_server_name)" -ForegroundColor Gray
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "Response: $($configResponse.Content)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "✗ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 4: Databricks validation
Write-Host -NoNewline "✓ Testing Databricks connection... "
try {
    $dbValidate = Invoke-WebRequest -Uri "$Url/api/databricks/validate" -UseBasicParsing -TimeoutSec 10
    if ($dbValidate.Content -like '*"ok"*') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED or INCOMPLETE CONFIG" -ForegroundColor Yellow
        Write-Host "Response: $($dbValidate.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ FAILED or INCOMPLETE CONFIG" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Test 5: Jobs list
Write-Host -NoNewline "✓ Testing jobs endpoint... "
try {
    $jobs = Invoke-WebRequest -Uri "$Url/api/jobs" -UseBasicParsing -TimeoutSec 10
    if ($jobs.Content -like '*"ok"*') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "Response: $($jobs.Content)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "✗ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 6: Pipelines list
Write-Host -NoNewline "✓ Testing pipelines endpoint... "
try {
    $pipelines = Invoke-WebRequest -Uri "$Url/api/pipelines" -UseBasicParsing -TimeoutSec 10
    if ($pipelines.Content -like '*"ok"*') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "Response: $($pipelines.Content)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "✗ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "✅ All checks passed! MCP tools are working in production." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some checks failed ($failed). Review the output above." -ForegroundColor Red
    exit 1
}
