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
        .join('\n');

      return {
        content: [{ type: 'text' as const, text: `WorkFlowy Targets:\n${formatted}` }],
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
          text: `Node created successfully.\nID: ${result.id}\nName: ${result.name}`
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
          text: `Node updated successfully.\nID: ${result.id}\nName: ${result.name}`
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

      let text = `Node: ${node.name}\n`;
      text += `ID: ${node.id}\n`;
      if (node.note) text += `Note: ${node.note}\n`;
      if (node.layoutMode) text += `Layout: ${node.layoutMode}\n`;
      if (node.completed !== undefined) text += `Completed: ${node.completed}\n`;
      if (node.parent) text += `Parent: ${node.parent}\n`;

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
          if (n.note) line += `\n  Note: ${n.note.slice(0, 50)}${n.note.length > 50 ? '...' : ''}`;
          return line;
        })
        .join('\n');

      return {
        content: [{ type: 'text' as const, text: `Child nodes:\n${formatted}` }],
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

      const summary = `Exported ${nodes.length} nodes from your WorkFlowy workspace.\n\n` +
        `First 10 nodes:\n` +
        nodes.slice(0, 10)
          .map((n: WorkFlowyNode) => `• ${n.name}${n.completed ? ' ✓' : ''}`)
          .join('\n') +
        (nodes.length > 10 ? `\n... and ${nodes.length - 10} more` : '');

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
