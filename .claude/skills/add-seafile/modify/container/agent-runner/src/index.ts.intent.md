# Intent: container/agent-runner/src/index.ts modifications

## What changed

**Added** Seafile MCP server wiring to the agent runner's main orchestration file.

## Why this file

`index.ts` is the agent runner's main entry point. It:
- Manages Claude Agent SDK lifecycle
- Configures MCP servers
- Whitelists available tools
- Handles agent invocation and responses

To make Seafile tools available to the agent, we must wire the MCP server into this orchestration layer.

## Modifications (5 total)

### 1. Declare compiled MCP server path

**Where**: Around line 544, with other MCP path constants

```typescript
const seafileMcpPath = path.join(__dirname, 'seafile-mcp-stdio.js');
```

**Why**: The MCP server runs as a separate Node process. We need the path to the compiled .js file to spawn it.

### 2. Add to runQuery signature

**Where**: Around line 360, function parameter list

```typescript
seafileMcpPath: string,  // Add after mcpServerPath
```

**Why**: `runQuery` is the function that invokes the agent. It needs all MCP server paths to configure the SDK properly.

**Ordering**: Seafile comes first in the integration list (alphabetically and chronologically), so it's the first custom MCP path parameter.

### 3. Whitelist tools in allowedTools

**Where**: Around line 436, in SDK configuration

```typescript
'mcp__seafile__*',  // Wildcard pattern
```

**Why**: The Agent SDK requires explicit tool whitelisting for security. Without this, Seafile tools won't be callable even if the server is running.

**Wildcard pattern**: Unlike other integrations that list individual tools, Seafile uses `*` wildcard. Both approaches work; wildcard is more maintainable when adding new tools.

**Tool naming**: MCP tools get prefixed with `mcp__{server_name}__` where server_name comes from the server configuration (in this case, "seafile").

### 4. Configure MCP server

**Where**: Around line 460, in the servers array

```typescript
...(containerInput.isMain && sdkEnv.SEAFILE_URL && sdkEnv.SEAFILE_TOKEN ? {
  seafile: {
    command: 'node',
    args: [seafileMcpPath],
    env: {
      SEAFILE_URL: sdkEnv.SEAFILE_URL,
      SEAFILE_TOKEN: sdkEnv.SEAFILE_TOKEN,
      SEAFILE_LOCAL_PATH: sdkEnv.SEAFILE_LOCAL_PATH,
    },
  },
} : {}),
```

**Why**: This tells the Agent SDK how to spawn the Seafile MCP server:
- **command**: Use Node.js to run the server
- **args**: Path to the compiled server file
- **env**: Pass through environment variables from host

**Conditional activation**: Only enable if:
1. `containerInput.isMain` - Only main channel gets Seafile access (security)
2. `sdkEnv.SEAFILE_URL` - URL is configured
3. `sdkEnv.SEAFILE_TOKEN` - Token is configured

If any condition fails, server is not spawned and tools won't be available.

**Three environment variables**:
- `SEAFILE_URL` (required): Seafile instance base URL
- `SEAFILE_TOKEN` (required): API token
- `SEAFILE_LOCAL_PATH` (optional): Path to local synced libraries for hybrid access

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
  seafileMcpPath,  // ADD THIS
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,
  substackMcpPath,
  containerInput,
  sdkEnv,
  resumeAt,
)
```

**Why**: All call sites must match the updated signature.

**Ordering**: Seafile is first in the MCP path parameter list because it was the first custom integration added chronologically.

## Integration pattern

This follows NanoClaw's standard MCP integration pattern, used by all external tools:

1. **Declare path** - Point to compiled .js file
2. **Update signature** - Add path parameter to runQuery
3. **Whitelist tools** - Add to allowedTools array (security)
4. **Configure server** - Spawn command + environment + conditions
5. **Update callers** - Pass path at all call sites

## Why conditional activation?

**Question**: Why check `containerInput.isMain`?

**Answer**: Security isolation. Other groups (e.g., "family") shouldn't have access to your personal Seafile. Only the main channel gets integrations.

**Question**: Why check for env vars?

**Answer**: Fail gracefully. If user hasn't configured Seafile, don't spawn a server that will immediately crash. Agent SDK will simply not have those tools available.

## Why not automatic?

**Question**: Why can't the Agent SDK auto-discover MCP servers?

**Answer**: Security and explicitness. NanoClaw requires:
- Explicit tool whitelisting (prevent accidental exposure)
- Explicit environment variable passing (no ambient env leakage)
- Explicit server configuration (clear spawn behavior)
- Explicit channel isolation (main vs other groups)

This makes the codebase more auditable and prevents surprises.

## Testing the integration

After wiring:

```bash
./scripts/update-agent-source.sh  # Sync and compile
systemctl --user restart nanoclaw  # Restart service
```

Agent should now have access to `mcp__seafile__*` tools.

Verify with:
```bash
# In WhatsApp, ask Sparky:
"List my Seafile libraries"
```

## Troubleshooting

**Tools not available**:
- Check allowedTools whitelist contains `'mcp__seafile__*'`
- Check SEAFILE_URL and SEAFILE_TOKEN in .env
- Check containerInput.isMain is true (not other group)

**Server not starting**:
- Check container logs: `cat groups/main/logs/container-*.log | tail -50`
- Look for MCP server startup errors

**Import errors**:
- Ensure seafile-mcp-stdio.ts compiles without errors
- Run `npm run build` and check for TypeScript errors
- Verify all dependencies installed

**Environment variables not passed**:
- Check container-runner.ts includes SEAFILE_URL, SEAFILE_TOKEN in readSecrets()
- Verify .env file has these values
- Restart service after changing .env
