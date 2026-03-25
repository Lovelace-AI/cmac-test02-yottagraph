# cmac-test02 - Design Document

## Project Overview

This app is an MCP operations dashboard for Lovelace tenants. It helps developers verify MCP server health and quickly run entity lookup tools from the UI without leaving the app.

**Created:** 2026-03-25  
**App ID:** cmac-test02  
**Description:** Aether app: cmac-test02  
**Last updated:** 2026-03-25

## Vision

Build a single-page MCP monitoring and testing interface that:

- shows health and availability for configured MCP servers
- discovers key tools on each server (especially `health` and `get_entity`)
- lets a user search for an entity and execute the `get_entity` tool directly
- displays request arguments and tool responses for debugging

## Configuration

| Setting        | Value                            |
| -------------- | -------------------------------- |
| Authentication | Not yet configured               |
| Query Server   | https://stable-query.lovelace.ai |

## Cross-Cutting Concepts

- MCP server calls are made through the tenant gateway using JSON-RPC (`/api/mcp/{org}/{server}/rpc`).
- The app discovers server names from tenant config and falls back to known Lovelace server names.
- Tool invocation uses schema-aware argument mapping with optional manual JSON override.
- UI reports both connectivity status (tool listing) and executable status (health tool call).

## Pages

### Home: MCP Health & Entity Tools

Name: MCP Server Health & Entity Tools  
Route: `/`  
Description: Main operational page for MCP server checks and entity tool execution.  
Implementation status: Implemented  
Details:

- Server cards display per-server status (`healthy`, `degraded`, `unavailable`), total tool count, detected health tool, and detected get-entity tool.
- Refresh action re-checks all servers and re-runs health checks where available.
- Entity runner allows choosing a server, entering an entity search term, and running detected get-entity style tools.
- Custom JSON arguments are supported for advanced/debug use cases.
- Request arguments and tool results are shown inline as formatted JSON.
