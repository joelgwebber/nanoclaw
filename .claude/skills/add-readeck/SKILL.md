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

Create `container/agent-runner/src/readeck-mcp-stdio.ts`:

```typescript
/**
 * Readeck MCP Server
 * Provides access to Readeck bookmark manager via REST API
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const READECK_URL = process.env.READECK_URL;
const READECK_API_KEY = process.env.READECK_API_KEY;

if (!READECK_URL || !READECK_API_KEY) {
  console.error('READECK_URL and READECK_API_KEY environment variables are required');
  process.exit(1);
}

// Remove trailing slash from URL
const BASE_URL = READECK_URL.replace(/\/$/, '');

interface ReadeckBookmark {
  id: string;
  url: string;
  title: string;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
  updated_at: string;
  excerpt?: string;
  tags?: string[];
  collection?: string;
}

async function apiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${READECK_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Readeck API error (${response.status}): ${errorText}`);
  }

  // DELETE may return empty response
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {};
  }

  return await response.json();
}

const server = new McpServer({
  name: 'readeck',
  version: '1.0.0',
});

// Create a bookmark (save URL)
server.tool(
  'readeck_create_bookmark',
  'Save a URL to Readeck for reading later. Readeck will fetch and parse the content.',
  {
    url: z.string().url().describe('URL to save'),
    tags: z.array(z.string()).optional().describe('Tags to apply to the bookmark'),
    collection: z.string().optional().describe('Collection to add bookmark to'),
  },
  async (args) => {
    try {
      const body: any = { url: args.url };
      if (args.tags && args.tags.length > 0) body.tags = args.tags;
      if (args.collection) body.collection = args.collection;

      const result = await apiRequest('/api/bookmarks', 'POST', body);

      return {
        content: [{
          type: 'text' as const,
          text: `Bookmark saved successfully.\\nID: ${result.id}\\nTitle: ${result.title || 'Untitled'}\\nURL: ${result.url}`
        }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// List bookmarks with filtering
server.tool(
  'readeck_list_bookmarks',
  'List bookmarks with optional filtering and pagination.',
  {
    page: z.number().optional().describe('Page number (default: 1)'),
    limit: z.number().optional().describe('Items per page (default: 20)'),
    status: z.enum(['unread', 'read', 'archived']).optional().describe('Filter by read status'),
    search: z.string().optional().describe('Search query to filter bookmarks'),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.page) params.append('page', args.page.toString());
      if (args.limit) params.append('limit', args.limit.toString());
      if (args.status) params.append('status', args.status);
      if (args.search) params.append('search', args.search);

      const queryString = params.toString();
      const endpoint = queryString ? `/api/bookmarks?${queryString}` : '/api/bookmarks';

      const data = await apiRequest(endpoint);
      const bookmarks = data.bookmarks || [];

      if (bookmarks.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No bookmarks found.' }],
        };
      }

      const formatted = bookmarks
        .map((b: ReadeckBookmark) => {
          let line = `• [${b.id}] ${b.title || 'Untitled'}`;
          line += `\\n  URL: ${b.url}`;
          line += `\\n  Status: ${b.status}`;
          if (b.excerpt) line += `\\n  Excerpt: ${b.excerpt.slice(0, 100)}${b.excerpt.length > 100 ? '...' : ''}`;
          if (b.tags && b.tags.length > 0) line += `\\n  Tags: ${b.tags.join(', ')}`;
          return line;
        })
        .join('\\n\\n');

      const total = data.total || bookmarks.length;
      const currentPage = args.page || 1;
      const pageSize = args.limit || 20;
      const totalPages = Math.ceil(total / pageSize);

      return {
        content: [{
          type: 'text' as const,
          text: `Bookmarks (page ${currentPage} of ${totalPages}, ${total} total):\\n\\n${formatted}`
        }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Get a specific bookmark
server.tool(
  'readeck_get_bookmark',
  'Retrieve full details of a specific bookmark.',
  {
    id: z.string().describe('Bookmark ID'),
  },
  async (args) => {
    try {
      const bookmark: ReadeckBookmark = await apiRequest(`/api/bookmarks/${args.id}`);

      let text = `Title: ${bookmark.title || 'Untitled'}\\n`;
      text += `URL: ${bookmark.url}\\n`;
      text += `Status: ${bookmark.status}\\n`;
      text += `ID: ${bookmark.id}\\n`;
      text += `Created: ${bookmark.created_at}\\n`;
      text += `Updated: ${bookmark.updated_at}\\n`;
      if (bookmark.excerpt) text += `\\nExcerpt:\\n${bookmark.excerpt}\\n`;
      if (bookmark.tags && bookmark.tags.length > 0) text += `\\nTags: ${bookmark.tags.join(', ')}\\n`;
      if (bookmark.collection) text += `Collection: ${bookmark.collection}\\n`;

      return {
        content: [{ type: 'text' as const, text }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Update bookmark status
server.tool(
  'readeck_update_status',
  'Update the read status of a bookmark.',
  {
    id: z.string().describe('Bookmark ID'),
    status: z.enum(['unread', 'read', 'archived']).describe('New status'),
  },
  async (args) => {
    try {
      await apiRequest(`/api/bookmarks/${args.id}/status`, 'PUT', { status: args.status });

      return {
        content: [{ type: 'text' as const, text: `Bookmark ${args.id} marked as ${args.status}.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Delete a bookmark
server.tool(
  'readeck_delete_bookmark',
  'Delete a bookmark permanently.',
  {
    id: z.string().describe('Bookmark ID to delete'),
  },
  async (args) => {
    try {
      await apiRequest(`/api/bookmarks/${args.id}`, 'DELETE');

      return {
        content: [{ type: 'text' as const, text: `Bookmark ${args.id} deleted successfully.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Search bookmarks
server.tool(
  'readeck_search',
  'Search bookmarks by keyword.',
  {
    query: z.string().describe('Search query'),
    limit: z.number().optional().describe('Maximum results to return (default: 20)'),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      params.append('search', args.query);
      if (args.limit) params.append('limit', args.limit.toString());

      const data = await apiRequest(`/api/bookmarks?${params.toString()}`);
      const bookmarks = data.bookmarks || [];

      if (bookmarks.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `No bookmarks found for query: "${args.query}"` }],
        };
      }

      const formatted = bookmarks
        .map((b: ReadeckBookmark) => `• [${b.id}] ${b.title || 'Untitled'}\\n  ${b.url}`)
        .join('\\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${bookmarks.length} bookmark(s) for "${args.query}":\\n\\n${formatted}`
        }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Start the stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. Wire into Agent Runner

Modify `container/agent-runner/src/index.ts`:

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

Modify `src/container-runner.ts`:

In the `readSecrets()` function (around line 95), add `'READECK_URL'` and `'READECK_API_KEY'` to the array:

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

Add this section to `groups/main/CLAUDE.md` after the WorkFlowy section:

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
- Parameters: `page` (optional), `limit` (optional, default: 20), `status` (optional: unread/read/archived), `search` (optional)
- Returns paginated results with total count

**mcp__readeck__readeck_get_bookmark**
- Get full details of a specific bookmark
- Parameters: `id` (bookmark ID)
- Returns title, URL, status, excerpt, tags, collection, and timestamps

**mcp__readeck__readeck_update_status**
- Update the read status of a bookmark
- Parameters: `id` (bookmark ID), `status` (unread/read/archived)
- Mark items as read, unread, or archived

**mcp__readeck__readeck_delete_bookmark**
- Delete a bookmark permanently
- Parameters: `id` (bookmark ID)

**mcp__readeck__readeck_search**
- Search bookmarks by keyword
- Parameters: `query` (search string), `limit` (optional, default: 20)
- Searches titles, content, and URLs

### Usage Examples

```
Save a bookmark:
mcp__readeck__readeck_create_bookmark(url="https://example.com/article", tags=["tech", "tutorial"])

List unread bookmarks:
mcp__readeck__readeck_list_bookmarks(status="unread", limit=10)

Search bookmarks:
mcp__readeck__readeck_search(query="python")

Mark as read:
mcp__readeck__readeck_update_status(id="abc123", status="read")

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
- **No tag/collection management** — Currently can't create or manage tags/collections, only assign existing ones when creating bookmarks
- **No offline support** — Requires internet connection to access your Readeck instance

## References

- [Readeck Documentation](https://readeck.org/en/docs/)
- [Readeck Source Repository](https://codeberg.org/readeck/readeck)
- [API Information (embedded in your Readeck instance)](https://readeck.org/en/blog/202512-2026-roadmap/)
- [OpenClaw Readeck Skill Reference](https://playbooks.com/skills/openclaw/skills/readeck)
