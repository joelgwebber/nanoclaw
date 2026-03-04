# Intent: container/agent-runner/src/index.ts modifications

## What changed

**Added** Substack MCP server wiring to the agent runner's main orchestration file.

## Why this file

`index.ts` is the agent runner's main entry point. It:
- Manages Claude Agent SDK lifecycle
- Configures MCP servers
- Whitelists available tools
- Handles agent invocation and responses

To make Substack tools available to the agent, we must wire the MCP server into this orchestration layer.

## Modifications (5 total)

### 1. Declare compiled MCP server path

**Where**: Around line 552, after `readeckMcpPath`

```typescript
const substackMcpPath = path.join(__dirname, 'substack-mcp-stdio.js');
```

**Why**: The MCP server runs as a separate Node process. We need the path to the compiled .js file to spawn it.

### 2. Add to runQuery signature

**Where**: Around line 360, function parameter list

```typescript
substackMcpPath: string,  // Add after readeckMcpPath
```

**Why**: `runQuery` is the function that invokes the agent. It needs all MCP server paths to configure the SDK properly.

**Ordering**: Substack comes last in the integration list (added most recently), so it's the last MCP path parameter.

### 3. Whitelist tools in allowedTools

**Where**: Around line 444, in SDK configuration

```typescript
'mcp__substack__*',  // Wildcard pattern
```

**Why**: The Agent SDK requires explicit tool whitelisting for security. Without this, Substack tools won't be callable even if the server is running.

**Wildcard pattern**: Uses `*` to match all Substack tools. More maintainable than listing each tool individually.

**Tool naming**: MCP tools get prefixed with `mcp__{server_name}__` where server_name is "substack".

### 4. Configure MCP server

**Where**: Around line 500, after the Readeck server config

```typescript
...(containerInput.isMain && sdkEnv.SUBSTACK_SID ? {
  substack: {
    command: 'node',
    args: [substackMcpPath],
    env: {
      SUBSTACK_SID: sdkEnv.SUBSTACK_SID,
      SUBSTACK_LLI: sdkEnv.SUBSTACK_LLI || '1',
    },
  },
} : {}),
```

**Why**: This tells the Agent SDK how to spawn the Substack MCP server:
- **command**: Use Node.js to run the server
- **args**: Path to the compiled server file
- **env**: Pass through environment variables from host

**Conditional activation**: Only enable if:
1. `containerInput.isMain` - Only main channel gets Substack access (security)
2. `sdkEnv.SUBSTACK_SID` - Session cookie is configured (required)

If any condition fails, server is not spawned and tools won't be available.

**Two environment variables**:
- `SUBSTACK_SID` (required): Session cookie for authentication
- `SUBSTACK_LLI` (optional): Login identifier, defaults to "1"

**Default for SUBSTACK_LLI**: If not set, we pass "1" instead of undefined. This improves compatibility with Substack's APIs.

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
  readeckMcpPath,
  substackMcpPath,  // ADD THIS
  containerInput,
  sdkEnv,
  resumeAt,
)
```

**Why**: All call sites must match the updated signature.

**Ordering**: Substack is last in the parameter list (most recent integration).

## Integration pattern

This follows NanoClaw's standard MCP integration pattern, used by all external tools:

1. **Declare path** - Point to compiled .js file
2. **Update signature** - Add path parameter to runQuery
3. **Whitelist tools** - Add to allowedTools array (security)
4. **Configure server** - Spawn command + environment + conditions
5. **Update callers** - Pass path at all call sites

## Why conditional activation?

**Question**: Why check `containerInput.isMain`?

**Answer**: Security isolation. Other groups (e.g., "family") shouldn't have access to your personal Substack. Only the main channel gets integrations.

**Question**: Why check for SUBSTACK_SID?

**Answer**: Fail gracefully. If user hasn't configured Substack cookies, don't spawn a server that will immediately crash. Agent SDK will simply not have those tools available.

## Why default SUBSTACK_LLI to "1"?

**Question**: Why not just pass undefined if SUBSTACK_LLI isn't set?

**Answer**: Some Substack APIs check for the presence of this cookie, not its specific value. Passing "1" as a default improves compatibility and matches observed behavior from the browser.

**Alternative considered**: Could make it truly optional and only pass if defined. Current approach is more defensive.

## Testing the integration

After wiring:

```bash
./container/build.sh  # REQUIRED: Substack adds cheerio dependency
systemctl --user restart nanoclaw  # Restart service
```

Agent should now have access to `mcp__substack__*` tools.

Verify with:
```bash
# In WhatsApp, ask Sparky:
"List my saved Substack articles"
```

## Troubleshooting

**Tools not available**:
- Check allowedTools whitelist contains `'mcp__substack__*'`
- Check SUBSTACK_SID in .env
- Check containerInput.isMain is true (not other group)

**Server not starting**:
- Check container logs: `cat groups/main/logs/container-*.log | tail -50`
- Look for "SUBSTACK_SID environment variable is required" error
- Verify cheerio dependency was installed (check package.json)

**Import errors**:
- Ensure substack-mcp-stdio.ts compiles without errors
- Run `npm run build` and check for TypeScript errors
- Verify cheerio is in container/agent-runner/package.json
- Rebuild container if cheerio was just added

**Environment variables not passed**:
- Check container-runner.ts includes SUBSTACK_SID, SUBSTACK_LLI in readSecrets()
- Verify .env file has these values
- Restart service after changing .env

**Authentication failures**:
- Cookies have expired - get fresh cookies from browser
- Verify you're logged into Substack when getting cookies
- Test manually: `curl "https://substack.com/api/v1/reader/posts?inboxType=saved&limit=1" -H "Cookie: substack.sid=$SUBSTACK_SID"`
