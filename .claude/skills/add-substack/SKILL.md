---
name: add-substack
description: Add Substack integration to NanoClaw as a tool for the main channel. Access saved articles from your Substack reading list and migrate them to Readeck or other systems.
---

# Add Substack Integration

This skill adds Substack support to NanoClaw as a tool available in the main channel. Substack integration allows you to access your saved articles, retrieve full content, and remove articles from your reading list.

## Phase 1: Pre-flight

### Check if already integrated

Check if Substack is already configured:

```bash
grep -q "SUBSTACK_SID" .env && echo "Already configured" || echo "Not configured"
grep -q "substack-mcp-stdio" container/agent-runner/src/index.ts && echo "Code integrated" || echo "Code not integrated"
```

If both show "Already configured" and "Code integrated", skip to Phase 3 (Verify).

### Get Substack Cookies

Ask the user:

> To access your Substack saved articles, I need two cookies from your browser:
> 1. `substack.sid` - Session ID cookie (required)
> 2. `substack.lli` - Login identifier cookie (optional, improves paid content access)
>
> Here's how to get them:
> 1. Open your browser and go to https://substack.com
> 2. Open Developer Tools (F12 or Cmd+Option+I)
> 3. Go to the "Application" or "Storage" tab
> 4. Find "Cookies" → "https://substack.com"
> 5. Look for `substack.sid` - copy its value
> 6. Look for `substack.lli` - copy its value (optional)
> 7. Paste them here

Wait for the user to provide:
- `SUBSTACK_SID` - The session ID cookie value (required)
- `SUBSTACK_LLI` - The login identifier cookie value (optional, defaults to "1")

## Phase 2: Apply Code Changes

### 1. Install Dependencies

The Substack MCP server requires `cheerio` for HTML-to-markdown conversion.

Update `container/agent-runner/package.json` to include cheerio:

```json
{
  "dependencies": {
    ...existing dependencies...,
    "cheerio": "^1.0.0"
  }
}
```

Then install:

```bash
cd container/agent-runner && npm install
```

### 2. Create MCP Server

Create `container/agent-runner/src/substack-mcp-stdio.ts` with the Substack MCP server implementation.

**Purpose**: Provides 3 tools for accessing Substack saved articles for migration to Readeck.

**Key features**:
- **Cookie-based auth**: Uses session cookies (no official API exists)
- **3 tools**: get_saved_articles, get_article (with HTML-to-markdown), remove_saved_article
- **Dual-fetch strategy**: For paid content, fetches from both API and HTML page to get full text
- **HTML-to-markdown**: Custom converter using cheerio (lighter than turndown)

**Implementation**: See `modify/container/agent-runner/src/substack-mcp-stdio.ts` for the complete MCP server code (~440 lines).

**Architecture notes**: See `modify/container/agent-runner/src/substack-mcp-stdio.ts.intent.md` for detailed design decisions on cookie auth, dual-fetch, and HTML conversion.

**Note**: This is based on [jenny-ouyang/substack-article-mcp](https://github.com/jenny-ouyang/substack-article-mcp) but adapted for NanoClaw.

### 3. Wire into Agent Runner

Modify `container/agent-runner/src/index.ts` to integrate the Substack MCP server.

**See** `modify/container/agent-runner/src/index.ts` for all required modifications.
**Architecture notes**: `modify/container/agent-runner/src/index.ts.intent.md` explains the integration pattern.

**Summary of changes**:

**Add path variable** (around line 552, after `readeckMcpPath`):

```typescript
const substackMcpPath = path.join(__dirname, 'substack-mcp-stdio.js');
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
  readeckMcpPath: string,
  substackMcpPath: string,  // ADD THIS LINE
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)
```

**Add to `allowedTools` array** (around line 444):

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
  'mcp__readeck__*',
  'mcp__substack__*'  // ADD THIS LINE
],
```

**Add MCP server configuration** (around line 500, after the Readeck server config):

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

**Update call site** (around line 590):

```typescript
const queryResult = await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,
  substackMcpPath,  // ADD THIS PARAMETER
  containerInput,
  sdkEnv,
  resumeAt
);
```

### 4. Add Credentials

Add to `.env`:

```bash
SUBSTACK_SID="<sid-cookie-from-user>"
SUBSTACK_LLI="<lli-cookie-from-user>"  # Optional, defaults to "1"
```

### 5. Pass Secrets to Container

Modify `src/container-runner.ts` to pass Substack credentials to the container.

**See** `modify/src/container-runner.ts` for the required modifications.
**Architecture notes**: `modify/src/container-runner.ts.intent.md` explains environment variable flow and cookie security.

**Summary**: In the `readSecrets()` function (around line 216), add `'SUBSTACK_SID'` and `'SUBSTACK_LLI'` to the array:

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
    'READECK_URL',
    'READECK_API_KEY',
    'SUBSTACK_SID',   // ADD THIS LINE
    'SUBSTACK_LLI'    // ADD THIS LINE
  ]);
}
```

### 6. Document in CLAUDE.md

Add the Substack documentation to `groups/main/CLAUDE.md` after the Readeck section.

**See** `modify/groups/main/CLAUDE.md` for the complete agent documentation.
**Architecture notes**: `modify/groups/main/CLAUDE.md.intent.md` explains documentation decisions and workflow-focused approach.

**Summary**: The documentation includes:
- Overview of Substack integration and cookie-based auth
- All 3 tools with parameters and descriptions
- **Workflow guidance**: Step-by-step workflow for migrating articles to Readeck (cross-integration)
- Usage examples for common operations

**Preview**:

```markdown
---

## Substack Saved Articles

You have access to Substack via MCP tools. These tools allow you to access your saved articles from your Substack reading list.

### Authentication

Substack authentication requires two cookies stored as environment variables:
- `SUBSTACK_SID` - Session ID cookie (required)
- `SUBSTACK_LLI` - Login identifier cookie (optional, improves paid content access)

These are automatically configured when available.

### Available Substack Tools

**mcp__substack__substack_get_saved_articles**
- Get all articles saved to your Substack reading list
- Parameters: `limit` (optional, default: 20, max: 100)
- Returns: Title, author, publication, subdomain, slug, URL, engagement stats
- Articles are sorted by publish date, newest first

**mcp__substack__substack_get_article**
- Get full content of a Substack article as markdown
- Parameters: `subdomain` (required, e.g. "platformer"), `slug` (required, e.g. "my-article-title")
- Returns: Full article content with metadata (title, subtitle, author, date, engagement stats)
- Automatically handles paid content if you're subscribed

**mcp__substack__substack_remove_saved_article**
- Remove an article from your Substack saved list
- Parameters: `post_id` (integer, from the saved articles list)
- Use this to clean up your reading list after archiving articles elsewhere

### Workflow: Moving Saved Articles to Readeck

1. List your saved Substack articles:
   \`\`\`
   mcp__substack__substack_get_saved_articles(limit=20)
   \`\`\`

2. For each article, get the full content:
   \`\`\`
   mcp__substack__substack_get_article(subdomain="platformer", slug="article-title")
   \`\`\`

3. Save it to Readeck:
   \`\`\`
   mcp__readeck__readeck_create_bookmark(url="https://platformer.substack.com/p/article-title", tags=["substack", "tech"])
   \`\`\`

4. Remove it from Substack saved list:
   \`\`\`
   mcp__substack__substack_remove_saved_article(post_id=12345)
   \`\`\`

### Usage Examples

\`\`\`
Get saved articles:
mcp__substack__substack_get_saved_articles(limit=10)

Get full article content:
mcp__substack__substack_get_article(subdomain="platformer", slug="why-elon-musk-bought-twitter")

Remove from saved list:
mcp__substack__substack_remove_saved_article(post_id=187132686)
\`\`\`
```

### 7. Validate

Build the host code:

```bash
npm run build
```

Build must be clean before proceeding.

## Phase 3: Deploy

### Build Container

The Substack integration requires rebuilding the container because we added the `cheerio` dependency:

```bash
./container/build.sh
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

> Substack is connected! Send this in your main channel:
>
> `@Sparky list my saved Substack articles` or `@Sparky migrate my Substack articles to Readeck`

### Check Logs if Needed

```bash
tail -f logs/nanoclaw.log
```

Look for successful MCP server initialization and tool calls.

## Troubleshooting

### "SUBSTACK_SID environment variable is required"

Check that the cookie value is in `.env` and the service was restarted after adding it.

### "Authentication failed"

The cookies have expired. Get fresh `substack.sid` and `substack.lli` values from your browser and update `.env`.

### Substack tools not responding

1. Verify you're logged into Substack in your browser
2. Check that the cookies are fresh (they expire periodically)
3. Test manually:
   ```bash
   curl "https://substack.com/api/v1/reader/posts?inboxType=saved&limit=1" \
     -H "Cookie: substack.sid=$SUBSTACK_SID; substack.lli=$SUBSTACK_LLI"
   ```
4. Check container logs: `cat groups/main/logs/container-*.log | tail -50`

### "Substack API error (401)" or "(403)"

Your session cookies are invalid or expired. Get new ones from your browser:
1. Go to https://substack.com (make sure you're logged in)
2. Open Developer Tools → Application → Cookies
3. Copy fresh `substack.sid` and `substack.lli` values
4. Update `.env` and restart the service

### Paid content showing as truncated

If you're subscribed to a newsletter's paid tier but still seeing truncated content:
1. Make sure `SUBSTACK_LLI` is set in `.env`
2. Verify you're actually subscribed to the paid tier for that publication
3. The tool will attempt to fetch full content from the HTML page, but this may not work for all publications

### Container can't access Substack

- Verify `SUBSTACK_SID` and `SUBSTACK_LLI` are in `readSecrets()` in `src/container-runner.ts`
- Check that the container build completed successfully (cheerio dependency must be installed)
- Verify the service restarted after changes
- Ensure network access to https://substack.com from the container

## Removal

To remove Substack integration:

1. Remove `SUBSTACK_SID` and `SUBSTACK_LLI` from `.env`
2. Delete `container/agent-runner/src/substack-mcp-stdio.ts`
3. Remove `"cheerio": "^1.0.0"` from `container/agent-runner/package.json`
4. Remove Substack references from `container/agent-runner/src/index.ts`:
   - Remove `substackMcpPath` variable
   - Remove `substackMcpPath` parameter from `runQuery()` signature
   - Remove `'mcp__substack__*'` from `allowedTools`
   - Remove `substack` MCP server configuration
   - Remove `substackMcpPath` from `runQuery()` call site
5. Remove `'SUBSTACK_SID'` and `'SUBSTACK_LLI'` from `readSecrets()` in `src/container-runner.ts`
6. Remove Substack section from `groups/main/CLAUDE.md`
7. Rebuild and restart:
   ```bash
   cd container/agent-runner && npm install  # Remove cheerio
   npm run build
   ./container/build.sh
   systemctl --user restart nanoclaw  # Linux
   # launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
   ```

## Known Limitations

- **Main channel only** — Substack tools are only available in the main channel for security reasons (same pattern as other integrations)
- **Cookie-based auth** — Requires session cookies that expire periodically. You'll need to refresh them when they expire.
- **No official API** — Uses undocumented Substack internal APIs discovered through browser DevTools. May break if Substack changes their API.
- **Paid content access** — Full content for paid newsletters requires an active subscription and valid `SUBSTACK_LLI` cookie
- **Rate limiting** — Substack may rate-limit excessive API requests
- **No writing/posting** — Read-only access to saved articles. Cannot post or manage subscriptions.

## References

- [jenny-ouyang/substack-article-mcp](https://github.com/jenny-ouyang/substack-article-mcp) - Original MCP implementation this is based on
- [Substack Reader API](https://substack.com/api/v1/reader/posts) - Undocumented endpoint for saved articles
- [Cheerio Documentation](https://cheerio.js.org/) - HTML parsing library used for markdown conversion
