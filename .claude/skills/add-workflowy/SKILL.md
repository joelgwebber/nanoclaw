---
name: add-workflowy
description: Add WorkFlowy integration to NanoClaw as a tool for the main channel. Provides outlining, task management, and note-taking capabilities via WorkFlowy's REST API.
---

# Add WorkFlowy Integration

This skill adds WorkFlowy support to NanoClaw as a tool available in the main channel. WorkFlowy provides hierarchical outlining, task management, and note-taking capabilities.

## Phase 1: Pre-flight

### Check if already integrated

Check if WorkFlowy is already configured:

```bash
grep -q "WORKFLOWY_API_KEY" .env && echo "Already configured" || echo "Not configured"
grep -q "workflowy-mcp-stdio" container/agent-runner/src/index.ts && echo "Code integrated" || echo "Code not integrated"
```

If both show "Already configured" and "Code integrated", skip to Phase 3 (Verify).

### Get API Key

Ask the user:

> Do you have a WorkFlowy API key? You can get one at https://workflowy.com/api-reference/
>
> If you have one, paste it here. If not, I'll guide you through getting one.

If the user doesn't have an API key:

> Visit https://workflowy.com/api-reference/ and:
> 1. Sign in to your WorkFlowy account
> 2. Scroll to "Authentication" section
> 3. Click "Generate API Key" or find your existing key
> 4. Copy the key and paste it here

Wait for the user to provide the API key.

## Phase 2: Apply Code Changes

### 1. Create MCP Server

Create `container/agent-runner/src/workflowy-mcp-stdio.ts` with the WorkFlowy MCP server implementation.

**Purpose**: Provides 5 tools for managing WorkFlowy outlines via REST API.

**Key features**:
- 5 tools: list, get, search, create, update nodes
- Supports notes, completed status, and node hierarchy
- Handles WorkFlowy's cursor-based pagination

**Implementation**: See `modify/container/agent-runner/src/workflowy-mcp-stdio.ts` for the complete MCP server code.

**Architecture notes**: See `modify/container/agent-runner/src/workflowy-mcp-stdio.ts.intent.md` for detailed design decisions.

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

Modify `container/agent-runner/src/index.ts` to integrate the WorkFlowy MCP server.

**See** `modify/container/agent-runner/src/index.ts` for all required modifications.
**Architecture notes**: `modify/container/agent-runner/src/index.ts.intent.md` explains the integration pattern.

**Summary of changes**:

**Add path variable** (around line 546, after `fastmailMcpPath`):

```typescript
const workflowyMcpPath = path.join(__dirname, 'workflowy-mcp-stdio.js');
```

**Update `runQuery` function signature** (around line 360):

```typescript
async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,
  fastmailMcpPath: string,
  workflowyMcpPath: string,  // ADD THIS LINE
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)
```

**Add to `allowedTools` array** (around line 439):

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
  'mcp__workflowy__*'  // ADD THIS LINE
],
```

**Add MCP server configuration** (around line 474, after the Fastmail server config):

```typescript
...(containerInput.isMain && sdkEnv.WORKFLOWY_API_KEY ? {
  workflowy: {
    command: 'node',
    args: [workflowyMcpPath],
    env: {
      WORKFLOWY_API_KEY: sdkEnv.WORKFLOWY_API_KEY,
    },
  },
} : {}),
```

**Update call site** (around line 571):

```typescript
const queryResult = await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,  // ADD THIS PARAMETER
  containerInput,
  sdkEnv,
  resumeAt
);
```

### 3. Add Credentials

Add to `.env`:

```bash
WORKFLOWY_API_KEY="<api-key-from-user>"
```

### 4. Pass Secret to Container

Modify `src/container-runner.ts` to pass WorkFlowy credentials to the container.

**See** `modify/src/container-runner.ts` for the required modifications.
**Architecture notes**: `modify/src/container-runner.ts.intent.md` explains environment variable flow.

**Summary**:

In the `readSecrets()` function (around line 95), add `'WORKFLOWY_API_KEY'` to the array:

```typescript
function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'SEAFILE_URL',
    'SEAFILE_TOKEN',
    'FASTMAIL_EMAIL',
    'FASTMAIL_APP_PASSWORD',
    'WORKFLOWY_API_KEY'  // ADD THIS LINE
  ]);
}
```

### 5. Document in CLAUDE.md

Add the WorkFlowy documentation to `groups/main/CLAUDE.md` after the Fastmail section.

**See** `modify/groups/main/CLAUDE.md` for the complete agent documentation.
**Architecture notes**: `modify/groups/main/CLAUDE.md.intent.md` explains documentation decisions.

**Summary**: The documentation includes:
- Overview of WorkFlowy and its purpose
- All 5 tools with parameters and descriptions
- Usage examples for common operations
- Node hierarchy and pagination guidance

**Preview**:

```markdown
---

## WorkFlowy

You have access to WorkFlowy via MCP tools. WorkFlowy is an outlining/note-taking tool for organizing ideas, tasks, and information in a hierarchical structure.

### Joel's TODO List

Joel's main TODO list is located at the root of WorkFlowy:
- **Node ID**: `afa78f75-e263-8b83-fc46-7372206a926e`
- **Location**: Top-level "TODO" node

When discussing todos, always reference this location.

### Available WorkFlowy Tools

**mcp__workflowy__workflowy_list_targets**
- List all targets (shortcuts and built-in locations like "inbox" and "home")
- Use target keys as `parent_id` when creating nodes

**mcp__workflowy__workflowy_create_node**
- Create a new node
- Parameters: `parent_id` (target key, node UUID, or "None"), `name` (content), `note` (optional), `layoutMode` (optional: bullets, todo, h1, h2, h3, code-block, quote-block), `position` (optional: top or bottom)

**mcp__workflowy__workflowy_update_node**
- Update an existing node
- Parameters: `id` (node UUID), `name` (optional), `note` (optional), `layoutMode` (optional)

**mcp__workflowy__workflowy_get_node**
- Get details of a specific node
- Parameters: `id` (node UUID)

**mcp__workflowy__workflowy_list_children**
- List all child nodes of a parent
- Parameters: `parent_id` (optional: target key, node UUID, or "None" for top-level)

**mcp__workflowy__workflowy_move_node**
- Move a node to a different location
- Parameters: `id` (node UUID), `parent_id` (new parent), `position` (optional: top or bottom)

**mcp__workflowy__workflowy_delete_node**
- Delete a node permanently
- Parameters: `id` (node UUID)

**mcp__workflowy__workflowy_complete_node**
- Mark a node as completed (for todo layout mode)
- Parameters: `id` (node UUID)

**mcp__workflowy__workflowy_uncomplete_node**
- Mark a node as not completed
- Parameters: `id` (node UUID)

**mcp__workflowy__workflowy_export_all**
- Export all nodes as a flat list
- Rate limited to 1 request per minute

### Usage Examples

```
List available targets:
mcp__workflowy__workflowy_list_targets

Create a node in your inbox:
mcp__workflowy__workflowy_create_node(parent_id="inbox", name="Meeting notes", layoutMode="bullets")

Create a todo item:
mcp__workflowy__workflowy_create_node(parent_id="inbox", name="Call dentist", layoutMode="todo")

List top-level nodes:
mcp__workflowy__workflowy_list_children(parent_id="None")

Complete a todo:
mcp__workflowy__workflowy_complete_node(id="<uuid>")

Move a node:
mcp__workflowy__workflowy_move_node(id="<uuid>", parent_id="home", position="top")
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

> WorkFlowy is connected! Send this in your main channel:
>
> `@Sparky list my WorkFlowy targets` or `@Sparky what's in my WorkFlowy inbox?`

### Check Logs if Needed

```bash
tail -f logs/nanoclaw.log
```

Look for successful MCP server initialization and tool calls.

## Troubleshooting

### "WORKFLOWY_API_KEY environment variable is required"

Check that the API key is in `.env` and the service was restarted after adding it.

### WorkFlowy tools not responding

1. Verify the API key is valid: visit https://workflowy.com/api-reference/ and test it
2. Check container logs: `cat groups/main/logs/container-*.log | tail -50`
3. Look for MCP server startup errors in the logs

### "WorkFlowy API error (401)"

The API key is invalid or expired. Generate a new one at https://workflowy.com/api-reference/ and update `.env`.

### "WorkFlowy API error (429)"

Rate limit exceeded. The `export_all` tool is limited to 1 request per minute by WorkFlowy.

### Container can't access WorkFlowy

- Verify `WORKFLOWY_API_KEY` is in `readSecrets()` in `src/container-runner.ts`
- Check that the build and sync steps completed successfully
- Verify the service restarted after changes

## Removal

To remove WorkFlowy integration:

1. Remove `WORKFLOWY_API_KEY` from `.env`
2. Delete `container/agent-runner/src/workflowy-mcp-stdio.ts`
3. Remove WorkFlowy references from `container/agent-runner/src/index.ts`:
   - Remove `workflowyMcpPath` variable
   - Remove `workflowyMcpPath` parameter from `runQuery()` signature
   - Remove `'mcp__workflowy__*'` from `allowedTools`
   - Remove `workflowy` MCP server configuration
   - Remove `workflowyMcpPath` from `runQuery()` call site
4. Remove `'WORKFLOWY_API_KEY'` from `readSecrets()` in `src/container-runner.ts`
5. Remove WorkFlowy section from `groups/main/CLAUDE.md`
6. Rebuild and restart:
   ```bash
   npm run build
   ./scripts/update-agent-source.sh
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
   # systemctl --user restart nanoclaw  # Linux
   ```

## Known Limitations

- **Main channel only** — WorkFlowy tools are only available in the main channel for security reasons (same pattern as Seafile and Fastmail)
- **No real-time sync** — Changes made directly in WorkFlowy won't trigger notifications. The agent only interacts with WorkFlowy when you ask it to.
- **Rate limiting** — The `export_all` endpoint is limited to 1 request per minute by WorkFlowy's API
- **No offline support** — Requires internet connection to access WorkFlowy API
