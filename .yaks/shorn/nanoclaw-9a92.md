---
id: nanoclaw-9a92
title: Expand yak IPC/MCP API for full workflow support
type: feature
priority: 2
created: '2026-03-02T06:02:35Z'
updated: '2026-03-02T06:14:25Z'
commit: e21a101
---

Add missing yak operations to IPC/MCP layer and refactor into dedicated file.

## Current state
- ✅ create_yak (with parent support)
- ✅ list_yaks (by status)

## Missing operations
- shave (hairy → shearing) - start working on a yak
- shorn (shearing → shorn) - mark complete
- regrow (shorn → hairy) - reopen
- show (get full details of a yak)
- update (modify title/description/priority)
- dep add/remove (manage dependencies)

## Refactoring needed
Current yak code is inline in src/ipc.ts (100+ lines). As we add more operations, this will bloat ipc.ts. Better to:
- Extract to src/yak-ipc.ts with dedicated handlers
- Keep ipc.ts as dispatcher that calls yak handlers
- Add corresponding MCP tools in container/agent-runner/src/ipc-mcp-stdio.ts

## Benefits
- Full yak workflow from agent (create → shave → work → shorn)
- Dependency tracking (block on other yaks)
- Update metadata without recreating
- Cleaner code organization
