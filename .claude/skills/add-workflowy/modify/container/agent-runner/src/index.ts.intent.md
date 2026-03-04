# Intent: container/agent-runner/src/index.ts modifications

## What changed

**Added** WorkFlowy MCP server wiring to the agent runner's main orchestration file.

## Modifications (5 total)

Same pattern as other MCP integrations. See add-readeck/modify/container/agent-runner/src/index.ts.intent.md for detailed explanation of the integration pattern.

### Summary

1. **Declare path**: `workflowyMcpPath = path.join(__dirname, 'workflowy-mcp-stdio.js')`
2. **Update signature**: Add `workflowyMcpPath: string` parameter to `runQuery`
3. **Whitelist tools**: Add 7 WorkFlowy tools to `allowedTools` array
4. **Configure server**: Add WorkFlowy server config with `WORKFLOWY_API_KEY` env
5. **Update callers**: Pass `workflowyMcpPath` at all `runQuery` call sites

### WorkFlowy-specific notes

**Single environment variable**: Unlike Readeck (URL + key) or Seafile (URL + token), WorkFlowy only needs an API key. The API base URL is constant (`https://workflowy.com/api/v1`).

**Tool count**: 7 tools for hierarchical outline management:
- List targets (shortcuts)
- Get/search nodes
- Create/update/move/delete nodes

**Tool naming**: Prefixed with `mcp__workflowy__workflowy_*` (double "workflowy" because server name is "workflowy" and tool names start with "workflowy_").
