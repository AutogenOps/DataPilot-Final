# Backend (Databricks + MCP + Claude)

This backend is Python-first and connects Databricks with an MCP server using Claude as the LLM provider.

## Folder Structure

- `src/main.py`: startup entrypoint
- `src/config/env.py`: environment parsing and validation
- `src/server/mcp_server.py`: MCP server bootstrap
- `src/clients/databricks_client.py`: Databricks connection config layer
- `src/clients/anthropic_client.py`: Claude (Anthropic) client bootstrap
- `src/tools/databricks/`: Databricks-specific MCP tool modules
- `src/types/models.py`: shared backend types

## Setup

1. Fill values in `backend/.env`.
2. Create and activate a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run server:

```bash
python -m src.main
```

## Current Scope

The backend exposes Databricks Jobs, Pipelines, Clusters, and local db-ai-kit
metadata through HTTP and MCP tools.

## Databricks retries and email reporting

Jobs and Pipelines operations retry at least three times before returning a
failure. After retry exhaustion, the backend sends a best-effort email report
with the error, problem, and attempted fixes.

Configure SMTP in `backend/.env.local`:

```bash
DATABRICKS_RETRY_ATTEMPTS=3
DATABRICKS_RETRY_DELAY_SECONDS=1
ALERT_EMAIL_TO=arushverma767@gmail.com
ALERT_EMAIL_FROM=datapilot@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=datapilot@example.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
```

If `SMTP_HOST` is not set, failures are still retried and logged, but email
delivery is skipped.

## db-ai-kit integration

The local `../db-ai-kit` folder is available through:

- `GET /api/db-ai-kit/skills`
- `GET /api/db-ai-kit/skills/{skill_name}`
- `GET /api/db-ai-kit/assets`
- `GET /api/db-ai-kit/mcp`

The same capabilities are registered as MCP tools:

- `db_ai_kit_skills_list`
- `db_ai_kit_skill_read`
- `db_ai_kit_assets_list`
- `db_ai_kit_mcp_config`
