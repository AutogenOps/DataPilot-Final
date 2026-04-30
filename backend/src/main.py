from src.config.env import env


def main() -> None:
    mode = (env.backend_mode or "http").lower()

    if mode == "mcp":
        from src.server.mcp_server import create_mcp_server

        mcp = create_mcp_server()
        print(
            f"[backend] {env.mcp_server_name} v{env.mcp_server_version} initialized for Databricks tools"
        )
        mcp.run(transport=env.mcp_transport)
        return

    # Default: HTTP API for the frontend.
    from src.server.http_api import create_app

    import uvicorn

    app = create_app()
    print(f"[backend] HTTP API listening on http://{env.mcp_host}:{env.port}")
    uvicorn.run(app, host=env.mcp_host, port=env.port, log_level=env.log_level)


if __name__ == "__main__":
    main()
