---
id: nanoclaw-8045
title: Add Substack MCP integration for saved articles
type: task
priority: 2
created: '2026-02-27T19:43:34Z'
updated: '2026-02-27T19:49:31Z'
commit: 0fa2106
---

Create Substack MCP server for NanoClaw based on jenny-ouyang's substack-article-mcp. Focus on accessing saved articles from reading list to enable automated migration to Readeck.

Key features needed:
- Cookie-based authentication (substack.sid, substack.lli)
- Get saved articles from inbox (likely endpoint: /api/v1/inbox/top?surface=inbox_saved)
- Get full article content with HTML to markdown conversion
- Integration with NanoClaw's container-runner

Implementation approach:
- Use Jenny's code as reference/starting point
- Create container/agent-runner/src/substack-mcp-stdio.ts
- Add Substack env vars to container-runner.ts
- Document in groups/main/CLAUDE.md

Future enhancement: Add tool to automatically pipe saved articles to Readeck
