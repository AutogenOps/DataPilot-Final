from mcp.server.fastmcp import FastMCP

from src.config.env import env
from src.server.mcp_tools import register_mcp_tools


def create_mcp_server() -> FastMCP:
    mcp = FastMCP(name=env.mcp_server_name)

    register_mcp_tools(mcp)

    return mcp
