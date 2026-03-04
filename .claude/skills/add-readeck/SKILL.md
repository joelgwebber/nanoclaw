---
name: add-readeck
description: Add Readeck integration to NanoClaw as a tool for the main channel. Provides bookmark management and read-it-later functionality for saving and organizing web content.
---

# Add Readeck Integration

This skill adds Readeck support to NanoClaw as a tool available in the main channel. Readeck is a self-hosted bookmark manager that saves the readable content of web pages for later reading.

## Phase 1: Pre-flight

### Check if already integrated

Check if Readeck is already configured:

```bash
grep -q "READECK_URL" .env && echo "Already configured" || echo "Not configured"
grep -q "readeck-mcp-stdio" container/agent-runner/src/index.ts && echo "Code integrated" || echo "Code not integrated"
```

If both show "Already configured" and "Code integrated", skip to Phase 3 (Verify).

### Get Instance Details

Ask the user:

> Do you have a Readeck instance running? You'll need:
> 1. Your Readeck instance URL (e.g., `https://readeck.example.com`)
> 2. An API token (created in Profile → API Token within Readeck)
>
> If you don't have Readeck set up yet, visit https://readeck.org/en/docs/ for installation instructions.

Wait for the user to provide:
- `READECK_URL` - The base URL of their Readeck instance
- `READECK_API_KEY` - The Bearer token from Readeck

## Phase 2: Apply Code Changes

### 1. Create MCP Server

Create `container/agent-runner/src/readeck-mcp-stdio.ts` with the Readeck MCP server implementation.

**Purpose**: Provides 7 tools for managing Readeck bookmarks via REST API.

**Key features**:
- Supports both JSON and form-urlencoded requests (Readeck API quirk)
- 7 tools: list, get, add, update, archive, delete, search bookmarks
- Handles tags, collections, and bookmark metadata

**Implementation**: See `modify/container/agent-runner/src/readeck-mcp-stdio.ts` for the complete MCP server code.

**Architecture notes**: See `modify/container/agent-runner/src/readeck-mcp-stdio.ts.intent.md` for detailed design decisions.


### 2. Wire into Agent Runner

Modify `container/agent-runner/src/index.ts` to integrate the Readeck MCP server.

**See** `modify/container/agent-runner/src/index.ts` for all required modifications.
**Architecture notes**: `modify/container/agent-runner/src/index.ts.intent.md` explains the integration pattern.

**Summary of changes**:

**Add path variable** (around line 550, after `workflowyMcpPath`):

```typescript
const readeckMcpPath = path.join(__dirname, 'readeck-mcp-stdio.js');
```

**Update `runQuery` function signature** (around line 360):

```typescript
async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,
  fastmailMcpPath: string,
  workflowyMcpPath: string,
  readeckMcpPath: string,  // ADD THIS LINE
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)
```

**Add to `allowedTools` array** (around line 442):

```typescript
allowedTools: [
  'Bash',
  'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch',
  'Task', 'TaskOutput', 'TaskStop',
  'TeamCreate', 'TeamDelete', 'SendMessage',
  'TodoWrite', 'ToolSearch', 'Skill',
  'NotebookEdit',
  'mcp__nanoclaw__*',
  'mcp__seafile__*',
  'mcp__fastmail__*',
  'mcp__workflowy__*',
  'mcp__readeck__*'  // ADD THIS LINE
],
```

**Add MCP server configuration** (around line 485, after the WorkFlowy server config):

```typescript
...(containerInput.isMain && sdkEnv.READECK_URL && sdkEnv.READECK_API_KEY ? {
  readeck: {
    command: 'node',
    args: [readeckMcpPath],
    env: {
      READECK_URL: sdkEnv.READECK_URL,
      READECK_API_KEY: sdkEnv.READECK_API_KEY,
    },
  },
} : {}),
```

**Update call site** (around line 583):

```typescript
const queryResult = await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,  // ADD THIS PARAMETER
  containerInput,
  sdkEnv,
  resumeAt
);
```

### 3. Add Credentials

Add to `.env`:

```bash
READECK_URL="https://your-readeck-instance.com"
READECK_API_KEY="your-api-key-here"
```

### 4. Pass Secrets to Container

Modify `src/container-runner.ts` to pass Readeck credentials to the container.

**See** `modify/src/container-runner.ts` for the required modifications.
**Architecture notes**: `modify/src/container-runner.ts.intent.md` explains environment variable flow.

**Summary**: In the `readSecrets()` function (around line 216), add `'READECK_URL'` and `'READECK_API_KEY'` to the array:

```typescript
function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'SEAFILE_URL',
    'SEAFILE_TOKEN',
    'FASTMAIL_EMAIL',
    'FASTMAIL_APP_PASSWORD',
    'WORKFLOWY_API_KEY',
    'READECK_URL',      // ADD THIS LINE
    'READECK_API_KEY'   // ADD THIS LINE
  ]);
}
```

### 5. Document in CLAUDE.md

Add the Readeck documentation to `groups/main/CLAUDE.md` after the WorkFlowy section.

**See** `modify/groups/main/CLAUDE.md` for the complete agent documentation.
**Architecture notes**: `modify/groups/main/CLAUDE.md.intent.md` explains documentation decisions.

**Summary**: The documentation includes:
- Overview of Readeck and its purpose
- All 7 tools with parameters and descriptions
- Usage examples for common operations
- Integration with other tools (e.g., Substack → Readeck migration)

**Preview**:

```markdown
---

## Readeck Bookmark Manager

You have access to Readeck via MCP tools. Readeck is a self-hosted bookmark manager that saves the readable content of web pages for later reading.

### Available Readeck Tools

**mcp__readeck__readeck_create_bookmark**
- Save a URL to Readeck for reading later
- Parameters: `url` (required), `tags` (optional array), `collection` (optional)
- Readeck fetches and parses the content automatically

**mcp__readeck__readeck_list_bookmarks**
- List bookmarks with filtering and pagination
- Parameters: `page` (optional), `limit` (optional, default: 20), `archived` (optional boolean: true=archived only, false=unarchived only), `search` (optional)
- Returns list of matching bookmarks

**mcp__readeck__readeck_get_bookmark**
- Get full details of a specific bookmark
- Parameters: `id` (bookmark ID)
- Returns title, URL, status, excerpt, tags, collection, and timestamps

**mcp__readeck__readeck_update_bookmark**
- Update labels (tags) on an existing bookmark
- Parameters: `id` (bookmark ID), `add_labels` (optional, comma-separated), `remove_labels` (optional, comma-separated)
- Examples: `add_labels="tech,tutorial"`, `remove_labels="old,deprecated"`
- Can add and remove labels in the same call

**mcp__readeck__readeck_mark_favorite**
- Mark or unmark a bookmark as favorite
- Parameters: `id` (bookmark ID), `favorite` (boolean: true to mark, false to unmark)

**mcp__readeck__readeck_update_read_progress**
- Update reading progress for a bookmark
- Parameters: `id` (bookmark ID), `progress` (integer 0-100, percentage of article read)
- Use 100 to mark as fully read, 0 for unread

**mcp__readeck__readeck_update_status**
- Update the archived status of a bookmark
- Parameters: `id` (bookmark ID), `archived` (boolean: true to archive, false to unarchive)
- Archive or unarchive bookmarks

**mcp__readeck__readeck_delete_bookmark**
- Delete a bookmark permanently
- Parameters: `id` (bookmark ID)

**mcp__readeck__readeck_search**
- Search bookmarks by keyword
- Parameters: `query` (search string), `limit` (optional, default: 20)
- Searches titles, content, and URLs

**mcp__readeck__readeck_list_labels**
- Get list of existing labels for discovery/autocomplete
- Parameters: `query` (optional search string to filter labels)
- Useful for finding available labels before adding them to bookmarks

### Usage Examples

```
Save a bookmark with tags:
mcp__readeck__readeck_create_bookmark(url="https://example.com/article", tags=["tech", "tutorial"])

List available labels:
mcp__readeck__readeck_list_labels()
mcp__readeck__readeck_list_labels(query="tech")

Update bookmark labels:
mcp__readeck__readeck_update_bookmark(id="abc123", add_labels="ai,machine-learning")
mcp__readeck__readeck_update_bookmark(id="abc123", remove_labels="old")
mcp__readeck__readeck_update_bookmark(id="abc123", add_labels="updated", remove_labels="draft")

Mark as favorite:
mcp__readeck__readeck_mark_favorite(id="abc123", favorite=true)

Mark as read:
mcp__readeck__readeck_update_read_progress(id="abc123", progress=100)

Set reading progress to 50%:
mcp__readeck__readeck_update_read_progress(id="abc123", progress=50)

List unarchived bookmarks:
mcp__readeck__readeck_list_bookmarks(archived=false, limit=10)

Search bookmarks:
mcp__readeck__readeck_search(query="python")

Archive a bookmark:
mcp__readeck__readeck_update_status(id="abc123", archived=true)

Get bookmark details:
mcp__readeck__readeck_get_bookmark(id="abc123")

Delete a bookmark:
mcp__readeck__readeck_delete_bookmark(id="abc123")
```
```

### 6. Validate

Build the host code:

```bash
npm run build
```

Build must be clean before proceeding.

## Phase 3: Deploy

### Sync Agent Source

```bash
./scripts/update-agent-source.sh
```

### Restart Service

**macOS (launchd):**
```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

**Linux (systemd):**
```bash
systemctl --user restart nanoclaw
```

### Verify Service Running

```bash
# macOS
launchctl list | grep nanoclaw

# Linux
systemctl --user status nanoclaw
```

## Phase 4: Verify

### Test Integration

Tell the user:

> Readeck is connected! Send this in your main channel:
>
> `@Sparky save https://example.com to Readeck` or `@Sparky what's in my Readeck?`

### Check Logs if Needed

```bash
tail -f logs/nanoclaw.log
```

Look for successful MCP server initialization and tool calls.

## Troubleshooting

### "READECK_URL and READECK_API_KEY environment variables are required"

Check that both values are in `.env` and the service was restarted after adding them.

### Readeck tools not responding

1. Verify your Readeck instance is accessible: `curl -I $READECK_URL`
2. Test the API key manually:
   ```bash
   curl "$READECK_URL/api/bookmarks?limit=1" \
     -H "Authorization: Bearer $READECK_API_KEY"
   ```
3. Check container logs: `cat groups/main/logs/container-*.log | tail -50`
4. Look for MCP server startup errors in the logs

### "Readeck API error (401)"

The API key is invalid or expired. Generate a new token in Readeck (Profile → API Token) and update `.env`.

### "Readeck API error (404)"

The bookmark ID doesn't exist, or the Readeck instance URL is incorrect.

### "Readeck API error (405)"

You may be using an outdated version of the MCP server. The label update tool requires PATCH with form-encoded data and repeated `labels` parameters.

### "Readeck API error (422)"

Invalid URL or malformed request body. Check that URLs are properly formatted.

### Container can't access Readeck

- Verify `READECK_URL` and `READECK_API_KEY` are in `readSecrets()` in `src/container-runner.ts`
- Check that the build and sync steps completed successfully
- Verify the service restarted after changes
- Ensure your Readeck instance is network-accessible from the container

## Removal

To remove Readeck integration:

1. Remove `READECK_URL` and `READECK_API_KEY` from `.env`
2. Delete `container/agent-runner/src/readeck-mcp-stdio.ts`
3. Remove Readeck references from `container/agent-runner/src/index.ts`:
   - Remove `readeckMcpPath` variable
   - Remove `readeckMcpPath` parameter from `runQuery()` signature
   - Remove `'mcp__readeck__*'` from `allowedTools`
   - Remove `readeck` MCP server configuration
   - Remove `readeckMcpPath` from `runQuery()` call site
4. Remove `'READECK_URL'` and `'READECK_API_KEY'` from `readSecrets()` in `src/container-runner.ts`
5. Remove Readeck section from `groups/main/CLAUDE.md`
6. Rebuild and restart:
   ```bash
   npm run build
   ./scripts/update-agent-source.sh
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
   # systemctl --user restart nanoclaw  # Linux
   ```

## Known Limitations

- **Main channel only** — Readeck tools are only available in the main channel for security reasons (same pattern as other integrations)
- **No real-time sync** — Changes made directly in Readeck won't trigger notifications. The agent only interacts with Readeck when you ask it to.
- **No full content retrieval** — The MCP server retrieves metadata and excerpts, but not the full parsed article content. For full article text, you'd need to visit Readeck directly.
- **No offline support** — Requires internet connection to access your Readeck instance
- **Form-encoded label updates** — The label update API uses form-encoded PATCH with repeated `labels` parameters, discovered through browser DevTools inspection. This is specific to Readeck's implementation.

## References

- [Readeck Documentation](https://readeck.org/en/docs/)
- [Readeck Source Repository](https://codeberg.org/readeck/readeck)
- [API Information (embedded in your Readeck instance)](https://readeck.org/en/blog/202512-2026-roadmap/)
- [OpenClaw Readeck Skill Reference](https://playbooks.com/skills/openclaw/skills/readeck)
