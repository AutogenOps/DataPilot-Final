# MCP Tools API Reference

This document describes the HTTP endpoints available for MCP tools in both development and production.

## Endpoints

### List Available MCP Tools

Get a list of all registered MCP tools available in the system.

```
GET /api/mcp/tools
```

**Response:**
```json
{
  "ok": true,
  "tools": [
    {
      "name": "databricks_validate_connection_config",
      "description": "Validate Databricks environment configuration only (no API call)."
    },
    {
      "name": "databricks_ping",
      "description": "Ping Databricks API using the configured host/token."
    },
    {
      "name": "databricks_jobs_status",
      "description": "Return job list with status/last run information."
    },
    {
      "name": "databricks_jobs_run",
      "description": "Trigger a Databricks job run now."
    },
    {
      "name": "databricks_jobs_stop",
      "description": "Stop (cancel) the most recent active run for a Databricks job."
    },
    {
      "name": "databricks_pipelines_status",
      "description": "Return pipeline list with current status information."
    },
    {
      "name": "databricks_pipelines_start",
      "description": "Start a DLT pipeline update."
    },
    {
      "name": "databricks_pipelines_stop",
      "description": "Stop a running DLT pipeline."
    },
    {
      "name": "db_ai_kit_skills_list",
      "description": "List all skills bundled with the local db-ai-kit."
    },
    {
      "name": "db_ai_kit_skill_read",
      "description": "Read a db-ai-kit skill's SKILL.md content."
    },
    {
      "name": "db_ai_kit_assets_list",
      "description": "List db-ai-kit scripts and pipeline assets."
    },
    {
      "name": "db_ai_kit_mcp_config",
      "description": "Return db-ai-kit MCP server configuration metadata."
    }
  ],
  "count": 12,
  "mcp_server_name": "databricks-mcp-server",
  "mcp_server_version": "0.1.0"
}
```

---

### Get MCP Server Configuration

Get the MCP server configuration and metadata.

```
GET /api/mcp/config
```

**Response:**
```json
{
  "ok": true,
  "mcp_server_name": "databricks-mcp-server",
  "mcp_server_version": "0.1.0",
  "mcp_transport": "stdio",
  "mcp_host": "127.0.0.1",
  "mcp_port": 3001,
  "tools_count": 12,
  "tools": [
    "databricks_validate_connection_config",
    "databricks_ping",
    "databricks_jobs_status",
    "databricks_jobs_run",
    "databricks_jobs_stop",
    "databricks_pipelines_status",
    "databricks_pipelines_start",
    "databricks_pipelines_stop",
    "db_ai_kit_skills_list",
    "db_ai_kit_skill_read",
    "db_ai_kit_assets_list",
    "db_ai_kit_mcp_config"
  ]
}
```

---

## Integration with Claude

MCP tools are automatically available to Claude for use in chat conversations. When you ask Claude to perform Databricks operations, it will invoke the appropriate tool:

### Examples

```
User: "Show me all Databricks jobs"
Claude uses: databricks_jobs_status

User: "Run job named data_pipeline"
Claude uses: databricks_jobs_run

User: "Stop the data_ingest pipeline"
Claude uses: databricks_pipelines_stop

User: "What skills are available in db-ai-kit?"
Claude uses: db_ai_kit_skills_list
```

## Error Responses

### Tool Not Found

```
GET /api/mcp/tools/nonexistent
```

**Response:**
```json
{
  "ok": false,
  "error": "Tool not found",
  "tool": "nonexistent"
}
```

Status: `404`

### Server Error

If Databricks connection fails or MCP initialization has issues:

```json
{
  "ok": false,
  "error": "Failed to initialize MCP tools",
  "details": "Connection to Databricks failed: Invalid token"
}
```

Status: `503`

## Usage Examples

### JavaScript/Fetch

```javascript
// List available tools
const response = await fetch('http://localhost:8080/api/mcp/tools');
const data = await response.json();
console.log(`${data.count} tools available:`, data.tools);

// Get config
const configResponse = await fetch('http://localhost:8080/api/mcp/config');
const config = await configResponse.json();
console.log('MCP Server:', config.mcp_server_name, config.mcp_server_version);
```

### cURL

```bash
# List tools
curl http://localhost:8080/api/mcp/tools | jq

# Get config
curl http://localhost:8080/api/mcp/config | jq

# Check if tools are available
curl http://localhost:8080/api/mcp/tools | jq '.count'
```

### Python

```python
import requests

# List available tools
response = requests.get('http://localhost:8080/api/mcp/tools')
tools = response.json()
print(f"Available tools: {tools['count']}")
for tool in tools['tools']:
    print(f"  - {tool['name']}: {tool['description']}")

# Get config
config = requests.get('http://localhost:8080/api/mcp/config').json()
print(f"\nServer: {config['mcp_server_name']} v{config['mcp_server_version']}")
```

## Tool Categories

### Databricks Connection & Validation
- `databricks_validate_connection_config` - Validate configuration
- `databricks_ping` - Test API connection

### Databricks Jobs
- `databricks_jobs_status` - List jobs
- `databricks_jobs_run` - Run a job
- `databricks_jobs_stop` - Stop a job

### Databricks Pipelines
- `databricks_pipelines_status` - List pipelines
- `databricks_pipelines_start` - Start pipeline
- `databricks_pipelines_stop` - Stop pipeline

### db-ai-kit Assets
- `db_ai_kit_skills_list` - List skills
- `db_ai_kit_skill_read` - Read skill details
- `db_ai_kit_assets_list` - List assets
- `db_ai_kit_mcp_config` - Get db-ai-kit config

## Prerequisites

For MCP tools to work in production:

1. **Databricks Credentials** must be set:
   - `DATABRICKS_HOST`
   - `DATABRICKS_TOKEN`

2. **Anthropic API Key** for Claude integration:
   - `ANTHROPIC_API_KEY`

3. **Backend running** in HTTP mode (default):
   - `BACKEND_MODE=http` (or unset for default)

## Notes

- All endpoints are available under both `/api/mcp/...` and `/mcp/...` paths
- The MCP server is automatically initialized when the HTTP API starts
- Tools are fully functional in both development and production environments
- No separate MCP server process is needed when using HTTP mode
