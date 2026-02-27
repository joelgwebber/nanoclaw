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
          text: `Bookmark saved successfully.\nID: ${result.id}\nTitle: ${result.title || 'Untitled'}\nURL: ${result.url}`
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
          line += `\n  URL: ${b.url}`;
          line += `\n  Status: ${b.status}`;
          if (b.excerpt) line += `\n  Excerpt: ${b.excerpt.slice(0, 100)}${b.excerpt.length > 100 ? '...' : ''}`;
          if (b.tags && b.tags.length > 0) line += `\n  Tags: ${b.tags.join(', ')}`;
          return line;
        })
        .join('\n\n');

      const total = data.total || bookmarks.length;
      const currentPage = args.page || 1;
      const pageSize = args.limit || 20;
      const totalPages = Math.ceil(total / pageSize);

      return {
        content: [{
          type: 'text' as const,
          text: `Bookmarks (page ${currentPage} of ${totalPages}, ${total} total):\n\n${formatted}`
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

      let text = `Title: ${bookmark.title || 'Untitled'}\n`;
      text += `URL: ${bookmark.url}\n`;
      text += `Status: ${bookmark.status}\n`;
      text += `ID: ${bookmark.id}\n`;
      text += `Created: ${bookmark.created_at}\n`;
      text += `Updated: ${bookmark.updated_at}\n`;
      if (bookmark.excerpt) text += `\nExcerpt:\n${bookmark.excerpt}\n`;
      if (bookmark.tags && bookmark.tags.length > 0) text += `\nTags: ${bookmark.tags.join(', ')}\n`;
      if (bookmark.collection) text += `Collection: ${bookmark.collection}\n`;

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
        .map((b: ReadeckBookmark) => `• [${b.id}] ${b.title || 'Untitled'}\n  ${b.url}`)
        .join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${bookmarks.length} bookmark(s) for "${args.query}":\n\n${formatted}`
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
