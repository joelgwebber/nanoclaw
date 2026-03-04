# Intent: src/container-runner.ts modifications

## What changed

**Added** `SEAFILE_URL` and `SEAFILE_TOKEN` to the `readSecrets()` function.

## Why this file

`container-runner.ts` is responsible for spawning the agent container (Linux VM) and setting up its environment. It:

1. Reads secrets from `.env` file
2. Passes them as environment variables to the container
3. Manages container lifecycle (build, start, stop)

For the Seafile MCP server to work inside the container, it needs `SEAFILE_URL` and `SEAFILE_TOKEN` environment variables. This modification enables that.

## The modification

**Where**: Around line 216, in the `readSecrets()` function

**What**:
```typescript
'SEAFILE_URL',    // ADD
'SEAFILE_TOKEN',  // ADD
```

**Why**: These two values are read from `.env` and made available to the container environment.

## Environment variable flow

```
.env file
  ↓
systemd/launchd reads and exports to process
  ↓
Node.js process (src/index.ts)
  ↓
container-runner.ts readSecrets() reads from process.env
  ↓
Container spawned with env vars
  ↓
container/agent-runner/src/index.ts receives via process.env
  ↓
Passed to MCP server spawn configuration
  ↓
seafile-mcp-stdio.ts reads from process.env
```

## Why explicit passing?

**Question**: Why not let the container inherit all environment variables?

**Answer**: Security and clarity.

1. **Principle of least privilege**: Container only gets the env vars it needs
2. **No accidental leakage**: Random env vars from host don't pollute container
3. **Auditability**: Looking at `readSecrets()` shows exactly what secrets containers have access to
4. **Debuggability**: If a secret is missing, it's easy to see it's not in the list

## What about SEAFILE_LOCAL_PATH?

**Question**: The MCP server supports `SEAFILE_LOCAL_PATH` for hybrid access. Why isn't it in `readSecrets()`?

**Answer**: It can be added if needed, but it's optional:

```typescript
'SEAFILE_LOCAL_PATH',  // Optional: path to local synced libraries
```

If not present, hybrid access falls back to API-only mode (which still works fine).

## Testing

After adding credentials:

1. **Add to .env**:
   ```bash
   SEAFILE_URL="https://your-seafile-instance.com"
   SEAFILE_TOKEN="your-api-token-here"
   ```

2. **Rebuild and restart**:
   ```bash
   npm run build
   ./scripts/update-agent-source.sh
   systemctl --user restart nanoclaw  # Linux
   # launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
   ```

3. **Verify in container**:
   ```bash
   # Check container logs for MCP server startup
   cat groups/main/logs/container-*.log | grep -i seafile
   ```

Should see: `Seafile MCP server started` or similar.

## Troubleshooting

**"SEAFILE_URL is not defined"**:
- Check .env file has `SEAFILE_URL=...`
- Restart service (systemd/launchd) after editing .env
- Verify service inherited env vars: `systemctl --user show-environment` (Linux)

**"SEAFILE_TOKEN is not defined"**:
- Same as above, for SEAFILE_TOKEN

**Credentials not reaching container**:
- Verify readSecrets() was updated and rebuilt: `npm run build`
- Check that ./scripts/update-agent-source.sh was run
- Restart service after code changes

## Alternative: Container-only secrets

**Question**: Could we put secrets in a container-specific config instead of .env?

**Answer**: Yes, but NanoClaw uses .env for all secrets by convention:
- Single source of truth (`.env` file)
- Works with systemd/launchd environment loading
- Easy to backup and restore
- Familiar pattern (like Docker Compose)

Container-specific configs would fragment secret management.
