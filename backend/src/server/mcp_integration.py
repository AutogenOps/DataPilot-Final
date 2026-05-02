"""MCP Integration for production deployment.

This module ensures MCP tools are always available in production, not just in
development or when running in exclusive "mcp" mode. It exposes MCP tools
through HTTP endpoints and initializes the MCP server for Claude integration.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from src.config.env import env


logger = logging.getLogger(__name__)


# Tool registry - static list of all available tools
_TOOLS_REGISTRY = {
    "databricks_validate_connection_config": {
        "name": "databricks_validate_connection_config",
        "description": "Validate Databricks environment configuration only (no API call).",
    },
    "databricks_ping": {
        "name": "databricks_ping",
        "description": "Ping Databricks API using the configured host/token.",
    },
    "databricks_jobs_status": {
        "name": "databricks_jobs_status",
        "description": "Return job list with status/last run information.",
    },
    "databricks_jobs_run": {
        "name": "databricks_jobs_run",
        "description": "Trigger a Databricks job run now.",
    },
    "databricks_jobs_stop": {
        "name": "databricks_jobs_stop",
        "description": "Stop (cancel) the most recent active run for a Databricks job.",
    },
    "databricks_pipelines_status": {
        "name": "databricks_pipelines_status",
        "description": "Return pipeline list with current status information.",
    },
    "databricks_pipelines_start": {
        "name": "databricks_pipelines_start",
        "description": "Start a DLT pipeline update.",
    },
    "databricks_pipelines_stop": {
        "name": "databricks_pipelines_stop",
        "description": "Stop a running DLT pipeline.",
    },
    "db_ai_kit_skills_list": {
        "name": "db_ai_kit_skills_list",
        "description": "List all skills bundled with the local db-ai-kit.",
    },
    "db_ai_kit_skill_read": {
        "name": "db_ai_kit_skill_read",
        "description": "Read a db-ai-kit skill's SKILL.md content.",
    },
    "db_ai_kit_assets_list": {
        "name": "db_ai_kit_assets_list",
        "description": "List db-ai-kit scripts and pipeline assets.",
    },
    "db_ai_kit_mcp_config": {
        "name": "db_ai_kit_mcp_config",
        "description": "Return db-ai-kit MCP server configuration metadata.",
    },
}


class MCPIntegration:
    """Manages MCP server instance and tool availability in production."""

    def __init__(self):
        self._mcp_server = None
        self._tools_registry = _TOOLS_REGISTRY.copy()

    def get_tools_list(self) -> dict[str, Any]:
        """Return list of available MCP tools for HTTP endpoint."""
        return {
            "ok": True,
            "tools": list(self._tools_registry.values()),
            "count": len(self._tools_registry),
            "mcp_server_name": env.mcp_server_name,
            "mcp_server_version": env.mcp_server_version,
        }

    def create_mcp_server(self):
        """Create and return MCP server instance for production use."""
        if self._mcp_server is not None:
            return self._mcp_server

        from mcp.server.fastmcp import FastMCP
        from src.server.mcp_tools import register_mcp_tools

        self._mcp_server = FastMCP(name=env.mcp_server_name)
        register_mcp_tools(self._mcp_server)

        logger.info(
            f"MCP Server '{env.mcp_server_name}' initialized with {len(self._tools_registry)} tools"
        )
        return self._mcp_server

    def start_mcp_server(self, transport: str = "stdio") -> None:
        """Start MCP server (for production deployment via MCP transport)."""
        mcp = self.create_mcp_server()
        logger.info(f"Starting MCP server with transport: {transport}")
        mcp.run(transport=transport)

    def get_mcp_config(self) -> dict[str, Any]:
        """Return MCP server configuration metadata."""
        return {
            "ok": True,
            "mcp_server_name": env.mcp_server_name,
            "mcp_server_version": env.mcp_server_version,
            "mcp_transport": env.mcp_transport,
            "mcp_host": env.mcp_host,
            "mcp_port": env.mcp_port,
            "tools_count": len(self._tools_registry),
            "tools": list(self._tools_registry.keys()),
        }


# Global MCP integration instance
_mcp_integration: MCPIntegration | None = None


def get_mcp_integration() -> MCPIntegration:
    """Get or create global MCP integration instance."""
    global _mcp_integration
    if _mcp_integration is None:
        _mcp_integration = MCPIntegration()
    return _mcp_integration


def initialize_mcp_for_production() -> None:
    """Initialize MCP tools for production deployment.

    This should be called once during app startup to ensure MCP tools
    are ready and available through the backend.
    """
    integration = get_mcp_integration()
    logger.info("MCP integration initialized for production")
    logger.info(f"Available MCP tools: {integration.get_tools_list()['count']}")
