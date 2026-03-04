# Intent: src/container-runner.ts modifications

## What changed

**Added** `SUBSTACK_SID` and `SUBSTACK_LLI` to the `readSecrets()` function.

## Why this file

`container-runner.ts` is responsible for spawning the agent container (Linux VM) and setting up its environment. It:

1. Reads secrets from `.env` file
2. Passes them as environment variables to the container
3. Manages container lifecycle (build, start, stop)

For the Substack MCP server to work inside the container, it needs `SUBSTACK_SID` and `SUBSTACK_LLI` environment variables. This modification enables that.

## The modification

**Where**: Around line 216, in the `readSecrets()` function

**What**:
```typescript
'SUBSTACK_SID',   // ADD (required)
'SUBSTACK_LLI'    // ADD (optional)
```

**Why**: These two cookie values are read from `.env` and made available to the container environment.

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
substack-mcp-stdio.ts reads from process.env
```

## Why explicit passing?

**Question**: Why not let the container inherit all environment variables?

**Answer**: Security and clarity.

1. **Principle of least privilege**: Container only gets the env vars it needs
2. **No accidental leakage**: Random env vars from host don't pollute container
3. **Auditability**: Looking at `readSecrets()` shows exactly what secrets containers have access to
4. **Debuggability**: If a secret is missing, it's easy to see it's not in the list

## What are these cookies?

**SUBSTACK_SID** (required):
- Session identifier cookie from browser
- Authenticates API requests as the logged-in user
- Expires periodically (user must refresh manually)
- Get from: Developer Tools → Application → Cookies → substack.com → substack.sid

**SUBSTACK_LLI** (optional):
- Login identifier cookie
- Improves access to paid content for subscribed newsletters
- Defaults to "1" if not provided
- Get from: Developer Tools → Application → Cookies → substack.com → substack.lli

**Why cookies not API keys?**: Substack has no official API. The web app uses internal APIs that require session cookies.

## Testing

After adding credentials:

1. **Get cookies from browser**:
   - Open https://substack.com (ensure logged in)
   - Developer Tools → Application → Cookies → https://substack.com
   - Copy `substack.sid` and `substack.lli` values

2. **Add to .env**:
   ```bash
   SUBSTACK_SID="<your-sid-cookie-value>"
   SUBSTACK_LLI="<your-lli-cookie-value>"  # Optional
   ```

3. **Rebuild and restart** (rebuild required for cheerio dependency):
   ```bash
   npm run build
   ./container/build.sh
   systemctl --user restart nanoclaw  # Linux
   # launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
   ```

4. **Verify in container**:
   ```bash
   # Check container logs for MCP server startup
   cat groups/main/logs/container-*.log | grep -i substack
   ```

Should see: `Substack MCP server started` or similar.

## Troubleshooting

**"SUBSTACK_SID is not defined"**:
- Check .env file has `SUBSTACK_SID=...`
- Restart service (systemd/launchd) after editing .env
- Verify service inherited env vars: `systemctl --user show-environment` (Linux)

**"Authentication failed"**:
- Cookies have expired - get fresh cookies from browser
- Make sure you're logged into Substack when extracting cookies
- Test manually:
  ```bash
  curl "https://substack.com/api/v1/reader/posts?inboxType=saved&limit=1" \
    -H "Cookie: substack.sid=$SUBSTACK_SID; substack.lli=$SUBSTACK_LLI"
  ```

**Credentials not reaching container**:
- Verify readSecrets() was updated and rebuilt: `npm run build`
- Check that ./container/build.sh was run (required for cheerio dependency)
- Restart service after code changes

**Paid content showing as truncated despite being subscribed**:
- Ensure SUBSTACK_LLI is set (not just SUBSTACK_SID)
- Verify you're actually subscribed to that publication's paid tier
- The MCP server will attempt dual-fetch, but it may still fail for some publications

## Why rebuild container?

Unlike other integrations (Seafile, Readeck, WorkFlowy), Substack requires rebuilding the container:

**Reason**: The Substack MCP server uses `cheerio` for HTML parsing. This is a new dependency that must be:
1. Added to `container/agent-runner/package.json`
2. Installed via `npm install`
3. Baked into the container image

**Other integrations** use only built-in dependencies (fetch, fs, etc.) so `./scripts/update-agent-source.sh` is sufficient. **Substack needs `./container/build.sh`.**

## Alternative: Container-only secrets

**Question**: Could we put cookies in a container-specific config instead of .env?

**Answer**: Yes, but NanoClaw uses .env for all secrets by convention:
- Single source of truth (`.env` file)
- Works with systemd/launchd environment loading
- Easy to backup and restore
- Familiar pattern (like Docker Compose)

Container-specific configs would fragment secret management.

## Security note

**Cookie storage**: Session cookies are sensitive credentials. They grant full access to the user's Substack account.

**Mitigation**:
- Stored in `.env` (should be in .gitignore)
- Only passed to isolated container (not exposed to other processes)
- Never logged or printed
- Expire automatically (Substack invalidates old sessions)

**Risk**: Same as storing API keys. If `.env` is compromised, attacker has Substack access. But:
- Read-only access (integration only fetches saved articles)
- Time-limited (cookies expire)
- Easy to revoke (log out of Substack)

Same security model as other credential-based integrations.
