---
name: add-seafile
description: Add Seafile integration to NanoClaw as a tool for the main channel. Provides cloud file storage with hybrid local/API access for reading, writing, uploading, and sharing files.
---

# Add Seafile Integration

This skill adds Seafile support to NanoClaw as a tool available in the main channel. Seafile integration provides hybrid local filesystem and API access to your cloud storage, with tools for managing files, directories, and share links.

## Phase 1: Pre-flight

### Check if already integrated

Check if Seafile is already configured:

```bash
grep -q "SEAFILE_URL" .env && echo "Already configured" || echo "Not configured"
grep -q "seafile-mcp-stdio" container/agent-runner/src/index.ts && echo "Code integrated" || echo "Code not integrated"
```

If both show "Already configured" and "Code integrated", skip to Phase 3 (Verify).

### Get Seafile Details

Ask the user:

> Do you have a Seafile instance? You'll need:
> 1. Your Seafile server URL (e.g., `https://seafile.example.com`)
> 2. An API token (generated in Settings → Account Settings → API Tokens)
>
> If you don't have Seafile set up yet, you can:
> - Use Seafile Cloud: https://cloud.seafile.com
> - Self-host: https://www.seafile.com/en/download/

Wait for the user to provide:
- `SEAFILE_URL` - The base URL of their Seafile instance
- `SEAFILE_TOKEN` - An API token from Seafile

## Phase 2: Apply Code Changes

### 1. Create MCP Server

Create `container/agent-runner/src/seafile-mcp-stdio.ts`:

**Note**: This is a large file (~450 lines). The key features are:

1. **Hybrid Local/API Access**: Tries to read files from local filesystem first (`/workspace/seafile`), falls back to API
2. **9 Tools**: list_libraries, list_dir, read_file, upload_file, create_dir, delete, move, search, create_share_link
3. **Share Link Creation**: New tool for creating shareable download links (stopgap for WhatsApp image sending)

See the current `container/agent-runner/src/seafile-mcp-stdio.ts` for the complete implementation. Key sections:

**Environment Setup**:
```typescript
const SEAFILE_URL = process.env.SEAFILE_URL;
const SEAFILE_TOKEN = process.env.SEAFILE_TOKEN;
const LOCAL_SEAFILE_PATH = '/workspace/seafile';
```

**Hybrid Access Pattern** (example from `seafile_read_file`):
```typescript
// Try local filesystem first
const localPath = path.join(LOCAL_SEAFILE_PATH, libraryName, filePath);
if (fs.existsSync(localPath)) {
  // Read from local file
  const content = fs.readFileSync(localPath, 'utf-8');
  return content;
}

// Fall back to API
const url = `${SEAFILE_URL}/api2/repos/${library_id}/file/?p=${encodeURIComponent(file_path)}`;
// ... API fetch logic
```

**Share Link Tool** (added recently):
```typescript
server.tool(
  'seafile_create_share_link',
  'Create a shareable download link for a file in Seafile.',
  {
    library_id: z.string(),
    path: z.string(),
    password: z.string().optional(),
    expire_days: z.number().int().min(1).optional(),
  },
  async (args) => {
    // POST to /api/v2.1/share-links/
    // Returns shareable URL with ?dl=1 appended for direct download
    const downloadLink = link ? `${link}?dl=1` : '';
  }
);
```

**Note**: The `?dl=1` parameter is automatically appended to share links to provide direct download access instead of showing a Seafile webpage. This ensures images and files can be viewed inline in messaging apps.

The complete file implements all 9 tools with full error handling, TypeScript typing, and hybrid access logic.

### 2. Wire into Agent Runner

Modify `container/agent-runner/src/index.ts`:

**Add path variable** (around line 544):

```typescript
const seafileMcpPath = path.join(__dirname, 'seafile-mcp-stdio.js');
```

**Update `runQuery` function signature** (around line 360):

```typescript
async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,  // ADD THIS LINE
  fastmailMcpPath: string,
  workflowyMcpPath: string,
  readeckMcpPath: string,
  substackMcpPath: string,
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)
```

**Add to `allowedTools` array** (around line 436):

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
  'mcp__seafile__*',  // ADD THIS LINE
  'mcp__fastmail__*',
  'mcp__workflowy__*',
  'mcp__readeck__*',
  'mcp__substack__*'
],
```

**Add MCP server configuration** (around line 460):

```typescript
...(containerInput.isMain && sdkEnv.SEAFILE_URL && sdkEnv.SEAFILE_TOKEN ? {
  seafile: {
    command: 'node',
    args: [seafileMcpPath],
    env: {
      SEAFILE_URL: sdkEnv.SEAFILE_URL,
      SEAFILE_TOKEN: sdkEnv.SEAFILE_TOKEN,
    },
  },
} : {}),
```

**Update call site** (around line 575):

```typescript
const queryResult = await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,  // ADD THIS PARAMETER
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,
  substackMcpPath,
  containerInput,
  sdkEnv,
  resumeAt
);
```

### 3. Add Credentials

Add to `.env`:

```bash
SEAFILE_URL="https://your-seafile-instance.com"
SEAFILE_TOKEN="your-api-token-here"
```

### 4. Pass Secrets to Container

Modify `src/container-runner.ts`:

In the `readSecrets()` function (around line 216), add `'SEAFILE_URL'` and `'SEAFILE_TOKEN'` to the array:

```typescript
function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'SEAFILE_URL',      // ADD THIS LINE
    'SEAFILE_TOKEN',    // ADD THIS LINE
    'FASTMAIL_EMAIL',
    'FASTMAIL_APP_PASSWORD',
    'WORKFLOWY_API_KEY',
    'READECK_URL',
    'READECK_API_KEY',
    'SUBSTACK_SID',
    'SUBSTACK_LLI'
  ]);
}
```

### 5. Document in CLAUDE.md

Add this section to `groups/main/CLAUDE.md` after the Seafile section (should be near the beginning since Seafile is an early integration):

```markdown
---

## Seafile Cloud Storage

You have access to Seafile cloud storage at https://files.j15r.com via MCP tools. Seafile provides file storage and sharing capabilities.

### Hybrid Local/API Access

The Seafile MCP server uses a hybrid approach:
1. **Local filesystem first**: Checks `/workspace/seafile` for files (fast, no network)
2. **API fallback**: Uses Seafile API if file not found locally (slower, but comprehensive)

This provides best-of-both-worlds: fast access to commonly used files, with full cloud coverage.

### Available Seafile Tools

**mcp__seafile__seafile_list_libraries**
- List all libraries (repositories) in your Seafile account
- No parameters required
- Returns library IDs, names, and types

**mcp__seafile__seafile_list_dir**
- List files and directories in a library
- Parameters: `library_id` (required), `path` (optional, default: "/")
- Returns entries with names, types, sizes, and modification times

**mcp__seafile__seafile_read_file**
- Read a file's content
- Parameters: `library_id`, `path`
- Uses hybrid access: local filesystem first, then API
- Best for text files (code, markdown, config, etc.)

**mcp__seafile__seafile_upload_file**
- Upload or update a file
- Parameters: `library_id`, `path`, `content`
- Creates parent directories automatically if needed

**mcp__seafile__seafile_create_dir**
- Create a new directory
- Parameters: `library_id`, `path`
- Creates parent directories automatically

**mcp__seafile__seafile_delete**
- Delete a file or directory
- Parameters: `library_id`, `path`
- Permanently deletes the item

**mcp__seafile__seafile_move**
- Move or rename a file/directory
- Parameters: `library_id`, `src_path`, `dst_path`
- Can move between directories in the same library

**mcp__seafile__seafile_search**
- Search for files and directories
- Parameters: `query`, `library_id` (optional)
- Searches file/directory names (not content)

**mcp__seafile__seafile_create_share_link**
- Create a shareable download link for a file
- Parameters: `library_id`, `path`, `password` (optional), `expire_days` (optional)
- Returns a URL that can be shared with others to download the file
- Use this when you need to provide access to images, documents, or any binary files

### When to Use Share Links vs. Reading Files

**Use `seafile_read_file`** for:
- Text files that can be displayed directly (txt, md, csv, code, etc.)
- Files you need to process or analyze

**Use `seafile_create_share_link`** for:
- Images (png, jpg, gif, etc.) - user can click the link to view
- Documents (pdf, docx, etc.)
- Binary files or anything you want the user to download
- When the user asks to "see" or "show" a file (e.g., "show me my insurance card")

### Usage Examples

\`\`\`
List all libraries:
mcp__seafile__seafile_list_libraries

List files in a directory:
mcp__seafile__seafile_list_dir(library_id="abc123", path="/Documents")

Read a file:
mcp__seafile__seafile_read_file(library_id="abc123", path="/Documents/notes.txt")

Upload a file:
mcp__seafile__seafile_upload_file(library_id="abc123", path="/Documents/report.md", content="# Report\\n\\nContent here...")

Create a shareable link (e.g., for "show me my insurance card"):
mcp__seafile__seafile_create_share_link(library_id="abc123", path="/Personal/insurance_card.png")

Create a password-protected link that expires in 7 days:
mcp__seafile__seafile_create_share_link(library_id="abc123", path="/Documents/confidential.pdf", password="secret123", expire_days=7)

Search for files:
mcp__seafile__seafile_search(query="budget", library_id="abc123")

Move a file:
mcp__seafile__seafile_move(library_id="abc123", src_path="/old/file.txt", dst_path="/new/file.txt")
\`\`\`
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

> Seafile is connected! Send this in your main channel:
>
> `@Sparky list my Seafile libraries` or `@Sparky what files are in my Documents folder?`

### Check Logs if Needed

```bash
tail -f logs/nanoclaw.log
```

Look for successful MCP server initialization and tool calls.

## Troubleshooting

### "SEAFILE_URL and SEAFILE_TOKEN environment variables are required"

Check that both values are in `.env` and the service was restarted after adding them.

### Seafile tools not responding

1. Verify your Seafile instance is accessible: `curl -I $SEAFILE_URL`
2. Test the API token manually:
   ```bash
   curl "$SEAFILE_URL/api2/repos/" \
     -H "Authorization: Token $SEAFILE_TOKEN"
   ```
3. Check container logs: `cat groups/main/logs/container-*.log | tail -50`
4. Look for MCP server startup errors in the logs

### "Seafile API error (401)"

The API token is invalid or expired. Generate a new token in Seafile (Settings → Account Settings → API Tokens) and update `.env`.

### "Seafile API error (404)"

The library ID or file path doesn't exist, or the Seafile instance URL is incorrect.

### "Seafile API error (403)"

You don't have permission to access that library or file. Check library sharing settings.

### Files not found locally but available via API

The local Seafile sync at `/workspace/seafile` may be incomplete. The hybrid system will automatically fall back to API access. To improve performance:
1. Ensure Seafile sync is running and up to date
2. Check that the library is synced to `/workspace/seafile`
3. The API fallback will work correctly, just slower

### Container can't access Seafile

- Verify `SEAFILE_URL` and `SEAFILE_TOKEN` are in `readSecrets()` in `src/container-runner.ts`
- Check that the build and sync steps completed successfully
- Verify the service restarted after changes
- Ensure your Seafile instance is network-accessible from the container
- Check firewall rules if self-hosting

## Removal

To remove Seafile integration:

1. Remove `SEAFILE_URL` and `SEAFILE_TOKEN` from `.env`
2. Delete `container/agent-runner/src/seafile-mcp-stdio.ts`
3. Remove Seafile references from `container/agent-runner/src/index.ts`:
   - Remove `seafileMcpPath` variable
   - Remove `seafileMcpPath` parameter from `runQuery()` signature
   - Remove `'mcp__seafile__*'` from `allowedTools`
   - Remove `seafile` MCP server configuration
   - Remove `seafileMcpPath` from `runQuery()` call site
4. Remove `'SEAFILE_URL'` and `'SEAFILE_TOKEN'` from `readSecrets()` in `src/container-runner.ts`
5. Remove Seafile section from `groups/main/CLAUDE.md`
6. Rebuild and restart:
   ```bash
   npm run build
   ./scripts/update-agent-source.sh
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
   # systemctl --user restart nanoclaw  # Linux
   ```

## Known Limitations

- **Main channel only** — Seafile tools are only available in the main channel for security reasons (same pattern as other integrations)
- **Hybrid access dependency** — Performance depends on local sync being up to date. API fallback ensures correctness but may be slower.
- **Text files only for read** — `seafile_read_file` works best with text files. For binary files (images, PDFs), use `seafile_create_share_link`
- **No real-time sync notification** — Changes made directly in Seafile won't trigger notifications. The agent only interacts with Seafile when you ask it to.
- **Library-scoped operations** — Cannot move files between different libraries (Seafile API limitation)
- **No offline support** — Requires network connection to access Seafile API (though local files work offline)

## References

- [Seafile Documentation](https://manual.seafile.com/)
- [Seafile Web API](https://download.seafile.com/published/web-api/home.md)
- [Seafile Client](https://www.seafile.com/en/download/) - For local sync setup
- [API v2.1 Share Links](https://download.seafile.com/published/web-api/v2.1/share-links.md)
