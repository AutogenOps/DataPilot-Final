from src.config.env import env


def main() -> None:
    mode = (env.backend_mode or "http").lower()

    # For production: HTTP API is always primary. MCP tools are integrated.
    # Set BACKEND_MODE=mcp-only to run exclusive MCP server (not recommended for production).
    if mode == "mcp-only":
        from src.server.mcp_server import create_mcp_server

        mcp = create_mcp_server()
        print(
            f"[backend] {env.mcp_server_name} v{env.mcp_server_version} initialized for Databricks tools"
        )
        mcp.run(transport=env.mcp_transport)
        return

    # Default and recommended for production: HTTP API with integrated MCP tools
    # MCP tools are initialized and available through:
    # - HTTP endpoints: /api/mcp/tools, /api/mcp/config
    # - MCP integration module for Claude or other MCP clients
    from src.server.http_api import create_app

    import uvicorn

    app = create_app()
    print(f"[backend] HTTP API listening on http://{env.mcp_host}:{env.port}")
    print(f"[backend] MCP tools available at /api/mcp/tools")
    print(f"[backend] MCP config available at /api/mcp/config")
    uvicorn.run(app, host=env.mcp_host, port=env.port, log_level=env.log_level)


if __name__ == "__main__":
    main()
