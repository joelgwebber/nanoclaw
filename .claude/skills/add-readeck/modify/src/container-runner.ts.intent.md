# Intent: src/container-runner.ts modifications

## What changed

**Added** `READECK_URL` and `READECK_API_KEY` to the `readSecrets()` function.

## Why this file

`container-runner.ts` manages container (Linux VM) lifecycle. Containers are isolated and don't inherit the host's environment variables. The `readSecrets()` function explicitly passes secrets from `.env` into the container environment.

## Environment Variable Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ .env file                                                       │
│ READECK_URL="https://readeck.example.com"                      │
│ READECK_API_KEY="secret_token_here"                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ systemd/launchd (loads .env, starts nanoclaw)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ src/index.ts (main Node.js process)                             │
│ process.env.READECK_URL available here                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ src/container-runner.ts → readSecrets()                         │
│ Reads .env again, builds secrets object                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Container spawn (docker run -e / bd container-runner)           │
│ Secrets passed as -e READECK_URL="..." -e READECK_API_KEY="..." │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ container/agent-runner/src/index.ts                             │
│ process.env.READECK_URL available in container                 │
│ Passes to MCP server via env: { READECK_URL, READECK_API_KEY } │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ container/agent-runner/src/readeck-mcp-stdio.ts                │
│ const READECK_URL = process.env.READECK_URL                    │
│ Uses credentials to make API calls                              │
└─────────────────────────────────────────────────────────────────┘
```

## The Modification

### Before

```typescript
function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    // ... other secrets ...
    'WORKFLOWY_API_KEY',
  ]);
}
```

### After

```typescript
function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    // ... other secrets ...
    'WORKFLOWY_API_KEY',
    'READECK_URL',      // ADD
    'READECK_API_KEY',  // ADD
  ]);
}
```

## Why explicit passthrough?

**Question**: Why not just inherit all environment variables?

**Answer**: Security and auditability.

1. **Principle of least privilege**: Containers only get the secrets they need
2. **Visibility**: Looking at readSecrets(), you see exactly what's passed
3. **No ambient authority**: Can't accidentally leak unrelated secrets
4. **Easier debugging**: Know exactly what's available in container

## Common mistakes

**Forgetting this step**: If you add credentials to `.env` and wire the MCP server in `container/agent-runner/src/index.ts`, but forget to update `readSecrets()`, the MCP server will fail to start with "READECK_URL and READECK_API_KEY environment variables are required".

**Wrong variable name**: Variable names must match exactly (case-sensitive) between:
- `.env` file
- `readSecrets()` array
- `container/agent-runner/src/index.ts` server env config
- MCP server's `process.env.VARIABLE_NAME`

## Testing

After adding credentials:

```bash
npm run build                         # Recompile container-runner.ts
systemctl --user restart nanoclaw      # Linux
launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
```

Check logs:
```bash
journalctl --user -u nanoclaw -f       # Linux
tail -f ~/Library/Logs/nanoclaw/*.log  # macOS
```

Should NOT see "READECK_URL and READECK_API_KEY environment variables are required" errors.

## Order

Variable order in the array doesn't affect functionality. However, keeping them grouped by integration (Seafile vars together, Fastmail vars together, etc.) makes the code more scannable.
