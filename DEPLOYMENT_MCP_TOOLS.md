# MCP Tools Production Deployment Guide

This guide explains how to ensure MCP tools are fully functional in production after deployment.

## Overview

MCP (Model Context Protocol) tools are now integrated into the HTTP API and available in both development and production environments. The backend automatically initializes and registers all MCP tools with Claude, regardless of deployment mode.

## Architecture

### Development (Local)
- HTTP API runs on `http://localhost:8080`
- MCP tools are automatically initialized during app startup
- Tools are accessible via HTTP endpoints: `/api/mcp/tools`, `/api/mcp/config`
- Available for use in chat operations via Claude integration

### Production (Vercel/Netlify)
- HTTP API serves the frontend and provides REST endpoints
- **MCP tools are always integrated** - no separate MCP server needed
- Tools are registered and available for Claude to use
- Tools discovery endpoint: `GET /api/mcp/tools`
- Tools configuration endpoint: `GET /api/mcp/config`

## Configuration

### Environment Variables

Ensure the following environment variables are set in your production environment:

```bash
# Backend mode (default: http, recommended for production)
BACKEND_MODE=http

# MCP Server configuration
MCP_SERVER_NAME=databricks-mcp-server
MCP_SERVER_VERSION=0.1.0

# Databricks credentials (required for tools to work)
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-databricks-pat-token
DATABRICKS_WAREHOUSE_ID=your-warehouse-id
DATABRICKS_DEFAULT_CATALOG=your-catalog
DATABRICKS_DEFAULT_SCHEMA=your-schema

# Claude/Anthropic credentials (for chat operations)
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-7-sonnet-latest

# CORS configuration (update for your production domain)
CORS_ALLOWED_ORIGIN=https://your-app-domain.com

# Optional: Email alerts for job failures
ALERT_EMAIL_TO=your-email@example.com
ALERT_EMAIL_FROM=noreply@your-app-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
```

## Available MCP Tools in Production

Once deployed, the following MCP tools are automatically available to Claude:

### Databricks Connection
- `databricks_validate_connection_config` - Validate environment configuration
- `databricks_ping` - Test connection to Databricks API

### Jobs Management
- `databricks_jobs_status` - List all jobs with status
- `databricks_jobs_run` - Trigger a job run
- `databricks_jobs_stop` - Stop a running job

### Pipelines Management
- `databricks_pipelines_status` - List all pipelines with status
- `databricks_pipelines_start` - Start a DLT pipeline
- `databricks_pipelines_stop` - Stop a running pipeline

### db-ai-kit Integration
- `db_ai_kit_skills_list` - List available skills
- `db_ai_kit_skill_read` - Read a skill's documentation
- `db_ai_kit_assets_list` - List assets and scripts
- `db_ai_kit_mcp_config` - Get MCP configuration metadata

## Vercel Deployment

### 1. Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings > Environment Variables**
3. Add all the environment variables listed above
4. Select which environments they apply to (Production, Preview, Development)

### 2. Deploy

```bash
git add .
git commit -m "feat: integrate MCP tools for production"
git push
```

The Vercel deployment will automatically:
1. Install Python dependencies from `backend/requirements.txt`
2. Start the HTTP API with integrated MCP tools
3. Serve the frontend
4. Make all MCP tools available to Claude

### 3. Verify MCP Tools Are Working

After deployment, test the endpoints:

```bash
# Check health
curl https://your-app.vercel.app/api/health

# List available MCP tools
curl https://your-app.vercel.app/api/mcp/tools

# Get MCP configuration
curl https://your-app.vercel.app/api/mcp/config
```

## Netlify Deployment

### 1. Update netlify.toml

Ensure your `netlify.toml` is configured:

```toml
[build]
command = "cd frontend && npm run build"
publish = "frontend/dist"

[functions]
directory = "backend"
node_bundler = "esbuild"

[[redirects]]
from = "/api/*"
to = "/.netlify/functions/api:splat"
status = 200

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

### 2. Configure Environment Variables in Netlify

1. Go to your Netlify site settings
2. Navigate to **Build & Deploy > Environment**
3. Add all the environment variables listed above

### 3. Deploy

```bash
git add .
git commit -m "feat: integrate MCP tools for production"
git push
```

### 4. Verify MCP Tools Are Working

```bash
# Check health
curl https://your-app.netlify.app/api/health

# List available MCP tools
curl https://your-app.netlify.app/api/mcp/tools

# Get MCP configuration
curl https://your-app.netlify.app/api/mcp/config
```

## Docker/Self-Hosted Deployment

### 1. Build Docker Image

Create a `Dockerfile` if not present:

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs

# Copy and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

WORKDIR /app/frontend
RUN npm install && npm run build

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV BACKEND_MODE=http
ENV PORT=8080

EXPOSE 8080

CMD ["python", "-m", "src.main"]
```

### 2. Build and Run

```bash
docker build -t datapilot-backend .
docker run -p 8080:8080 \
  -e DATABRICKS_HOST=your-host \
  -e DATABRICKS_TOKEN=your-token \
  -e ANTHROPIC_API_KEY=your-key \
  datapilot-backend
```

### 3. Verify MCP Tools

```bash
curl http://localhost:8080/api/mcp/tools
curl http://localhost:8080/api/mcp/config
```

## Troubleshooting

### MCP Tools Not Available

1. **Check environment variables**: Ensure `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, and `ANTHROPIC_API_KEY` are set
2. **Check backend mode**: Run `echo $BACKEND_MODE` - should be `http` (default) or `mcp-only`
3. **Check logs**: Look for initialization messages mentioning MCP tools
4. **Test health endpoint**: `curl https://your-app.vercel.app/api/health`

### Connection Errors

1. **Databricks connection fails**:
   ```bash
   curl https://your-app.vercel.app/api/databricks/validate
   ```
   If this fails, check your `DATABRICKS_HOST` and `DATABRICKS_TOKEN`

2. **CORS errors**: Update `CORS_ALLOWED_ORIGIN` to match your frontend domain

3. **Chat operations fail**: Verify `ANTHROPIC_API_KEY` is set correctly

### Tools Not Showing in Claude

1. Restart the backend service
2. Check that tools are registered: `curl https://your-app.vercel.app/api/mcp/tools`
3. Verify that the MCP integration was initialized by checking logs for "MCP integration initialized for production"

## Support

For issues or questions:
1. Check the logs in your deployment platform (Vercel/Netlify dashboard)
2. Verify all environment variables are correctly set
3. Test endpoints individually to isolate the issue
4. Review the backend code in `src/server/mcp_integration.py` and `src/server/http_api.py`
