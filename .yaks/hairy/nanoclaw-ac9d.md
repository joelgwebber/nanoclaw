---
id: nanoclaw-ac9d
title: Add Discord integration via MCP server
type: feature
priority: 2
created: '2026-03-01T22:02:05Z'
updated: '2026-03-01T22:02:05Z'
---

Enable Discord monitoring and interaction to track conversations and topics without manual Discord access. Primary use case: Monitor specific Discord servers/channels for interesting discussions (e.g., NanoClaw demos, tech updates) and provide summaries or notifications.

Implementation Options:

**Recommended: SaseQ/discord-mcp**
- Docker-based (matches NanoClaw architecture)
- Most mature: 194 stars, 43 forks, 57 commits
- Already tested with Claude Desktop, Cursor, OpenClaw
- Comprehensive features: messages, webhooks, roles, DMs, categories
- Docker image: saseq/discord-mcp:latest
- Auth: DISCORD_BOT_TOKEN + optional DISCORD_GUILD_ID
- GitHub: https://github.com/SaseQ/discord-mcp

**Alternative 1: GustyCube/discord-mcp**
- Most comprehensive (120+ Discord API tools)
- Real-time event streaming via Gateway
- Security: guild/channel allowlists
- Node.js/TypeScript based
- Recent (July 2025), actively developed
- GitHub: https://github.com/GustyCube/discord-mcp

**Alternative 2: tolgasumer/discord-mcp**
- Go-based (lightweight, fast)
- Excellent event streaming (messageCreated, memberAdded, reactions)
- YAML-based event configuration
- Recent (August 2025)
- GitHub: https://github.com/tolgasumer/discord-mcp

Implementation Steps:
1. Create Discord bot and get DISCORD_BOT_TOKEN
2. Add MCP server to NanoClaw's docker-compose or MCP config
3. Configure bot permissions (Read Messages, Send Messages, Message Content intent)
4. Set up guild/channel allowlists for security
5. Test basic operations: read messages, send messages, monitor channels
6. Create scheduled tasks to monitor specific channels and report interesting activity

No add-skill format exists - all Discord integrations are MCP servers requiring stdio configuration.
