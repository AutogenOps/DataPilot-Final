#!/usr/bin/env python
"""Test script to verify MCP integration."""

from src.server.mcp_integration import get_mcp_integration

print("Testing MCP integration...")
mcp = get_mcp_integration()
print("✓ MCP Integration initialized")

tools = mcp.get_tools_list()
print(f"✓ Found {tools['count']} tools")
print(f"✓ MCP Server: {tools['mcp_server_name']} v{tools['mcp_server_version']}")

print("\nAvailable tools:")
for tool in tools['tools']:
    print(f"  - {tool['name']}")

config = mcp.get_mcp_config()
print(f"\n✓ MCP Config: {config['mcp_server_name']} listening on {config['mcp_host']}:{config['mcp_port']}")
print("✓ All tests passed!")
