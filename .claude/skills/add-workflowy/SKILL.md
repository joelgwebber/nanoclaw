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

Create `container/agent-runner/src/workflowy-mcp-stdio.ts`:

```typescript
/**
 * WorkFlowy MCP Server
 * Provides access to WorkFlowy nodes via their REST API
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const WORKFLOWY_API_KEY = process.env.WORKFLOWY_API_KEY;
const BASE_URL = 'https://workflowy.com/api/v1';

if (!WORKFLOWY_API_KEY) {
  console.error('WORKFLOWY_API_KEY environment variable is required');
  process.exit(1);
}

interface WorkFlowyNode {
  id: string;
  name: string;
  note?: string;
  layoutMode?: string;
  completed?: boolean;
  parent?: string;
  children?: WorkFlowyNode[];
}

interface WorkFlowyTarget {
  key: string;
  name: string;
  node_id?: string;
}

async function apiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${WORKFLOWY_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'DELETE')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WorkFlowy API error (${response.status}): ${errorText}`);
  }

  // DELETE may return empty response
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {};
  }

  return await response.json();
}

const server = new McpServer({
  name: 'workflowy',
  version: '1.0.0',
});

// List targets (shortcuts and built-in locations like inbox)
server.tool(
  'workflowy_list_targets',
  'List all WorkFlowy targets (shortcuts and built-in locations like "inbox" and "home"). Use these target keys as parent_id when creating nodes.',
  {},
  async () => {
    try {
      const data = await apiRequest('/targets');
      const targets = data.targets || [];

      if (targets.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No targets found.' }],
        };
      }

      const formatted = targets
        .map((t: WorkFlowyTarget) => `• ${t.key}: ${t.name}${t.node_id ? ` (${t.node_id})` : ''}`)
        .join('\\n');

      return {
        content: [{ type: 'text' as const, text: `WorkFlowy Targets:\\n${formatted}` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Create a new node
server.tool(
  'workflowy_create_node',
  'Create a new node in WorkFlowy. Use target keys like "inbox" or "home", or use a node UUID as parent_id.',
  {
    parent_id: z.string().describe('Parent node UUID, target key ("inbox", "home"), or "None" for top-level'),
    name: z.string().describe('Node content (supports markdown and HTML)'),
    note: z.string().optional().describe('Additional note content'),
    layoutMode: z.enum(['bullets', 'todo', 'h1', 'h2', 'h3', 'code-block', 'quote-block']).optional().describe('Display mode'),
    position: z.enum(['top', 'bottom']).optional().describe('Position in parent (default: top)'),
  },
  async (args) => {
    try {
      const body: any = {
        parent_id: args.parent_id,
        name: args.name,
      };

      if (args.note) body.note = args.note;
      if (args.layoutMode) body.layoutMode = args.layoutMode;
      if (args.position) body.position = args.position;

      const result = await apiRequest('/nodes', 'POST', body);

      return {
        content: [{
          type: 'text' as const,
          text: `Node created successfully.\\nID: ${result.id}\\nName: ${result.name}`
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

// Update a node
server.tool(
  'workflowy_update_node',
  'Update an existing WorkFlowy node.',
  {
    id: z.string().describe('Node UUID'),
    name: z.string().optional().describe('Updated node content'),
    note: z.string().optional().describe('Updated note content'),
    layoutMode: z.enum(['bullets', 'todo', 'h1', 'h2', 'h3', 'code-block', 'quote-block']).optional().describe('Updated display mode'),
  },
  async (args) => {
    try {
      const body: any = {};
      if (args.name !== undefined) body.name = args.name;
      if (args.note !== undefined) body.note = args.note;
      if (args.layoutMode) body.layoutMode = args.layoutMode;

      const result = await apiRequest(`/nodes/${args.id}`, 'POST', body);

      return {
        content: [{
          type: 'text' as const,
          text: `Node updated successfully.\\nID: ${result.id}\\nName: ${result.name}`
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

// Get a specific node
server.tool(
  'workflowy_get_node',
  'Retrieve details of a specific WorkFlowy node.',
  {
    id: z.string().describe('Node UUID'),
  },
  async (args) => {
    try {
      const node: WorkFlowyNode = await apiRequest(`/nodes/${args.id}`);

      let text = `Node: ${node.name}\\n`;
      text += `ID: ${node.id}\\n`;
      if (node.note) text += `Note: ${node.note}\\n`;
      if (node.layoutMode) text += `Layout: ${node.layoutMode}\\n`;
      if (node.completed !== undefined) text += `Completed: ${node.completed}\\n`;
      if (node.parent) text += `Parent: ${node.parent}\\n`;

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

// List child nodes
server.tool(
  'workflowy_list_children',
  'List all child nodes of a parent. Use target keys like "inbox" or "home", node UUID, or "None" for top-level nodes.',
  {
    parent_id: z.string().optional().describe('Parent node UUID, target key, or "None" for top-level (default: top-level)'),
  },
  async (args) => {
    try {
      const params = args.parent_id ? `?parent_id=${encodeURIComponent(args.parent_id)}` : '';
      const data = await apiRequest(`/nodes${params}`);
      const nodes = data.nodes || [];

      if (nodes.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No child nodes found.' }],
        };
      }

      const formatted = nodes
        .map((n: WorkFlowyNode) => {
          let line = `• [${n.id}] ${n.name}`;
          if (n.completed) line += ' ✓';
          if (n.layoutMode) line += ` (${n.layoutMode})`;
          if (n.note) line += `\\n  Note: ${n.note.slice(0, 50)}${n.note.length > 50 ? '...' : ''}`;
          return line;
        })
        .join('\\n');

      return {
        content: [{ type: 'text' as const, text: `Child nodes:\\n${formatted}` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Move a node
server.tool(
  'workflowy_move_node',
  'Move a node to a different parent location.',
  {
    id: z.string().describe('Node UUID to move'),
    parent_id: z.string().describe('New parent node UUID, target key, or "None" for top-level'),
    position: z.enum(['top', 'bottom']).optional().describe('Position in new parent (default: top)'),
  },
  async (args) => {
    try {
      const body: any = {
        parent_id: args.parent_id,
      };

      if (args.position) body.position = args.position;

      await apiRequest(`/nodes/${args.id}/move`, 'POST', body);

      return {
        content: [{ type: 'text' as const, text: `Node moved successfully to ${args.parent_id}` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Delete a node
server.tool(
  'workflowy_delete_node',
  'Delete a WorkFlowy node permanently.',
  {
    id: z.string().describe('Node UUID to delete'),
  },
  async (args) => {
    try {
      await apiRequest(`/nodes/${args.id}`, 'DELETE');

      return {
        content: [{ type: 'text' as const, text: `Node ${args.id} deleted successfully.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Complete a node
server.tool(
  'workflowy_complete_node',
  'Mark a node as completed (for todo layout mode).',
  {
    id: z.string().describe('Node UUID to complete'),
  },
  async (args) => {
    try {
      await apiRequest(`/nodes/${args.id}/complete`, 'POST');

      return {
        content: [{ type: 'text' as const, text: `Node ${args.id} marked as completed.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Uncomplete a node
server.tool(
  'workflowy_uncomplete_node',
  'Mark a node as not completed (for todo layout mode).',
  {
    id: z.string().describe('Node UUID to uncomplete'),
  },
  async (args) => {
    try {
      await apiRequest(`/nodes/${args.id}/uncomplete`, 'POST');

      return {
        content: [{ type: 'text' as const, text: `Node ${args.id} marked as not completed.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Export all nodes (rate limited to 1/minute)
server.tool(
  'workflowy_export_all',
  'Export all WorkFlowy nodes as a flat list. Rate limited to 1 request per minute.',
  {},
  async () => {
    try {
      const data = await apiRequest('/nodes-export');
      const nodes = data.nodes || [];

      if (nodes.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No nodes found in export.' }],
        };
      }

      const summary = `Exported ${nodes.length} nodes from your WorkFlowy workspace.\\n\\n` +
        `First 10 nodes:\\n` +
        nodes.slice(0, 10)
          .map((n: WorkFlowyNode) => `• ${n.name}${n.completed ? ' ✓' : ''}`)
          .join('\\n') +
        (nodes.length > 10 ? `\\n... and ${nodes.length - 10} more` : '');

      return {
        content: [{ type: 'text' as const, text: summary }],
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

Modify `src/container-runner.ts`:

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

Add this section to `groups/main/CLAUDE.md` after the Fastmail section:

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
