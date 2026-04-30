from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from src.tools.databricks.connection import (
    ping_databricks_api,
    validate_databricks_connection_config,
)
from src.tools.databricks.jobs import list_jobs, run_job, stop_job
from src.tools.databricks.pipelines import list_pipelines, start_pipeline, stop_pipeline
from src.tools.db_ai_kit import (
    get_db_ai_kit_mcp_config,
    list_db_ai_kit_assets,
    list_db_ai_kit_skills,
    read_db_ai_kit_skill,
)


def register_mcp_tools(mcp: FastMCP) -> None:
    """Register MCP tools.

    Keep MCP tool declarations in this module so adding new tools is just:
    1) implement backend helper in src/tools/
    2) add a new @mcp.tool here
    """

    @mcp.tool(name="databricks_validate_connection_config")
    def databricks_validate_connection_config() -> dict:
        """Validate Databricks environment configuration only (no API call)."""

        return validate_databricks_connection_config()

    @mcp.tool(name="databricks_ping")
    def databricks_ping() -> dict:
        """Ping Databricks API using the configured host/token."""

        return ping_databricks_api()

    @mcp.tool(name="databricks_jobs_status")
    def databricks_jobs_status() -> dict:
        """Return job list with status/last run information."""

        return list_jobs()

    @mcp.tool(name="databricks_jobs_run")
    def databricks_jobs_run(jobId: str) -> dict:  # noqa: N803
        """Trigger a Databricks job run now."""

        return run_job(jobId)

    @mcp.tool(name="databricks_jobs_stop")
    def databricks_jobs_stop(jobId: str) -> dict:  # noqa: N803
        """Stop (cancel) the most recent active run for a Databricks job."""

        return stop_job(jobId)

    @mcp.tool(name="databricks_pipelines_status")
    def databricks_pipelines_status() -> dict:
        """Return pipeline list with current status information."""

        return list_pipelines()

    @mcp.tool(name="databricks_pipelines_start")
    def databricks_pipelines_start(pipelineId: str) -> dict:  # noqa: N803
        """Start a DLT pipeline update."""

        return start_pipeline(pipelineId)

    @mcp.tool(name="databricks_pipelines_stop")
    def databricks_pipelines_stop(pipelineId: str) -> dict:  # noqa: N803
        """Stop a running DLT pipeline."""

        return stop_pipeline(pipelineId)

    @mcp.tool(name="db_ai_kit_skills_list")
    def db_ai_kit_skills_list() -> dict:
        """List all skills bundled with the local db-ai-kit."""

        return list_db_ai_kit_skills()

    @mcp.tool(name="db_ai_kit_skill_read")
    def db_ai_kit_skill_read(skillName: str) -> dict:  # noqa: N803
        """Read a db-ai-kit skill's SKILL.md content."""

        return read_db_ai_kit_skill(skillName)

    @mcp.tool(name="db_ai_kit_assets_list")
    def db_ai_kit_assets_list() -> dict:
        """List db-ai-kit scripts and pipeline assets."""

        return list_db_ai_kit_assets()

    @mcp.tool(name="db_ai_kit_mcp_config")
    def db_ai_kit_mcp_config() -> dict:
        """Return db-ai-kit MCP server configuration metadata."""

        return get_db_ai_kit_mcp_config()
