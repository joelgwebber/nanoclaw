# Intent: container/agent-runner/src/index.ts modifications

## What changed

**Added** Readeck MCP server wiring to the agent runner's main orchestration file.

## Why this file

`index.ts` is the agent runner's main entry point. It:
- Manages Claude Agent SDK lifecycle
- Configures MCP servers
- Whitelists available tools
- Handles agent invocation and responses

To make Readeck tools available to the agent, we must wire the MCP server into this orchestration layer.

## Modifications (5 total)

### 1. Declare compiled MCP server path

**Where**: Around line 550, with other MCP path constants

```typescript
const readeckMcpPath = path.join(__dirname, 'readeck-mcp-stdio.js');
```

**Why**: The MCP server runs as a separate Node process. We need the path to the compiled .js file to spawn it.

### 2. Add to runQuery signature

**Where**: Around line 360, function parameter list

```typescript
readeckMcpPath: string,  // Add after workflowyMcpPath
```

**Why**: `runQuery` is the function that invokes the agent. It needs all MCP server paths to configure the SDK properly.

### 3. Whitelist tools in allowedTools

**Where**: Around line 442, in SDK configuration

```typescript
'mcp__readeck__list_bookmarks',
'mcp__readeck__get_bookmark',
'mcp__readeck__add_bookmark',
'mcp__readeck__update_bookmark',
'mcp__readeck__archive_bookmark',
'mcp__readeck__delete_bookmark',
'mcp__readeck__search_bookmarks',
```

**Why**: The Agent SDK requires explicit tool whitelisting for security. Without this, Readeck tools won't be callable even if the server is running.

**Tool naming**: MCP tools get prefixed with `mcp__{server_name}__` where server_name comes from the server configuration.

### 4. Configure MCP server

**Where**: Around line 476, in the servers array

```typescript
{
  command: 'node',
  args: [readeckMcpPath],
  env: {
    READECK_URL: process.env.READECK_URL,
    READECK_API_KEY: process.env.READECK_API_KEY,
  },
}
```

**Why**: This tells the Agent SDK how to spawn the Readeck MCP server:
- **command**: Use Node.js to run the server
- **args**: Path to the compiled server file
- **env**: Pass through environment variables from host

**Environment variable flow**:
```
.env file → systemd/launchd → Node.js process → container (via container-runner.ts) → Agent SDK → MCP server
```

### 5. Update runQuery call sites

**Where**: Multiple locations (search for `runQuery(`)

```typescript
await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,  // ADD THIS
  containerInput,
  sdkEnv,
  resumeAt,
)
```

**Why**: All call sites must match the updated signature.

## Integration pattern

This follows NanoClaw's standard MCP integration pattern, used by all external tools:

1. **Declare path** - Point to compiled .js file
2. **Update signature** - Add path parameter to runQuery
3. **Whitelist tools** - Add to allowedTools array (security)
4. **Configure server** - Spawn command + environment
5. **Update callers** - Pass path at all call sites

## Why not automatic?

**Question**: Why can't the Agent SDK auto-discover MCP servers?

**Answer**: Security and explicitness. NanoClaw requires:
- Explicit tool whitelisting (prevent accidental exposure)
- Explicit environment variable passing (no ambient env leakage)
- Explicit server configuration (clear spawn behavior)

This makes the codebase more auditable and prevents surprises.

## Testing the integration

After wiring:

```bash
./scripts/update-agent-source.sh  # Sync and compile
systemctl --user restart nanoclaw  # Restart service
```

Agent should now have access to `mcp__readeck__*` tools.

Verify with:
```bash
# In WhatsApp, ask Sparky:
"What Readeck tools do you have access to?"
```

## Troubleshooting

**Tools not available**: Check allowedTools whitelist
**Server not starting**: Check READECK_URL and READECK_API_KEY in .env
**Import errors**: Ensure readeck-mcp-stdio.ts compiles without errors
