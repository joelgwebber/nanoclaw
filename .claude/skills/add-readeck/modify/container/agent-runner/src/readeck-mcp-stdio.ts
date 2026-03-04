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
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  excerpt?: string;
  tags?: string[];
  collection?: string;
}

// Helper to compute display status from bookmark fields
function getStatus(bookmark: ReadeckBookmark): 'archived' | 'unread' {
  return bookmark.is_archived ? 'archived' : 'unread';
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

async function formRequest(
  endpoint: string,
  method: 'POST' | 'PATCH',
  formData: Record<string, string | number>
): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(formData)) {
    body.append(key, String(value));
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${READECK_API_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Readeck API error (${response.status}): ${errorText}`);
  }

  // May return empty response
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
    archived: z.boolean().optional().describe('Filter by archived status (true=archived only, false=unarchived only, omit=all)'),
    search: z.string().optional().describe('Search query to filter bookmarks'),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.page) params.append('page', args.page.toString());
      if (args.limit) params.append('limit', args.limit.toString());
      if (args.archived !== undefined) params.append('is_archived', args.archived.toString());
      if (args.search) params.append('search', args.search);

      const queryString = params.toString();
      const endpoint = queryString ? `/api/bookmarks?${queryString}` : '/api/bookmarks';

      const data = await apiRequest(endpoint);
      const bookmarks = Array.isArray(data) ? data : [];

      if (bookmarks.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No bookmarks found.' }],
        };
      }

      const formatted = bookmarks
        .map((b: ReadeckBookmark) => {
          let line = `• [${b.id}] ${b.title || 'Untitled'}`;
          line += `\n  URL: ${b.url}`;
          line += `\n  Status: ${getStatus(b)}`;
          if (b.excerpt) line += `\n  Excerpt: ${b.excerpt.slice(0, 100)}${b.excerpt.length > 100 ? '...' : ''}`;
          if (b.tags && b.tags.length > 0) line += `\n  Tags: ${b.tags.join(', ')}`;
          return line;
        })
        .join('\n\n');

      const currentPage = args.page || 1;
      const pageSize = args.limit || 20;

      return {
        content: [{
          type: 'text' as const,
          text: `Bookmarks (showing ${bookmarks.length}):\n\n${formatted}`
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
      text += `Status: ${getStatus(bookmark)}\n`;
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

// Update bookmark labels
server.tool(
  'readeck_update_bookmark',
  'Update bookmark labels (tags). Add or remove specific labels from a bookmark.',
  {
    id: z.string().describe('Bookmark ID'),
    add_labels: z.string().optional().describe('Comma-separated labels to add (e.g. "tech,tutorial,ai")'),
    remove_labels: z.string().optional().describe('Comma-separated labels to remove (e.g. "old,deprecated")'),
  },
  async (args) => {
    try {
      if (!args.add_labels && !args.remove_labels) {
        return {
          content: [{ type: 'text' as const, text: 'No updates specified. Provide add_labels or remove_labels.' }],
          isError: true,
        };
      }

      // Get current bookmark to see existing labels
      const bookmark: ReadeckBookmark = await apiRequest(`/api/bookmarks/${args.id}`);
      const currentLabels = new Set(bookmark.tags || []);

      // Add new labels
      if (args.add_labels) {
        const toAdd = args.add_labels.split(',').map(l => l.trim()).filter(l => l);
        toAdd.forEach(label => currentLabels.add(label));
      }

      // Remove labels
      if (args.remove_labels) {
        const toRemove = args.remove_labels.split(',').map(l => l.trim()).filter(l => l);
        toRemove.forEach(label => currentLabels.delete(label));
      }

      // Build form data with repeated labels parameter
      const finalLabels = Array.from(currentLabels);
      const url = `${BASE_URL}/api/bookmarks/${args.id}`;
      const body = new URLSearchParams();
      finalLabels.forEach(label => body.append('labels', label));

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${READECK_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Readeck API error (${response.status}): ${errorText}`);
      }

      const operations = [];
      if (args.add_labels) operations.push(`added: ${args.add_labels}`);
      if (args.remove_labels) operations.push(`removed: ${args.remove_labels}`);

      return {
        content: [{ type: 'text' as const, text: `Labels updated successfully (${operations.join(', ')}). Current labels: ${finalLabels.join(', ')}` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Mark bookmark as favorite
server.tool(
  'readeck_mark_favorite',
  'Mark or unmark a bookmark as favorite.',
  {
    id: z.string().describe('Bookmark ID'),
    favorite: z.boolean().describe('Whether to mark as favorite (true) or unmark (false)'),
  },
  async (args) => {
    try {
      await formRequest(`/api/bookmarks/${args.id}`, 'PATCH', { is_marked: args.favorite ? 1 : 0 });

      return {
        content: [{ type: 'text' as const, text: `Bookmark ${args.favorite ? 'marked as favorite' : 'unmarked'}.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Update read progress
server.tool(
  'readeck_update_read_progress',
  'Update reading progress for a bookmark. Use 100 to mark as fully read, 0 for unread.',
  {
    id: z.string().describe('Bookmark ID'),
    progress: z.number().int().min(0).max(100).describe('Reading progress percentage (0-100)'),
  },
  async (args) => {
    try {
      await formRequest(`/api/bookmarks/${args.id}`, 'PATCH', { read_progress: args.progress });

      const status = args.progress === 100 ? 'marked as read' : args.progress === 0 ? 'marked as unread' : `progress set to ${args.progress}%`;
      return {
        content: [{ type: 'text' as const, text: `Bookmark ${status}.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Update bookmark status (archive/unarchive)
server.tool(
  'readeck_update_status',
  'Update the archived status of a bookmark.',
  {
    id: z.string().describe('Bookmark ID'),
    archived: z.boolean().describe('Whether to archive (true) or unarchive (false) the bookmark'),
  },
  async (args) => {
    try {
      await apiRequest(`/api/bookmarks/${args.id}`, 'PUT', { is_archived: args.archived });

      return {
        content: [{ type: 'text' as const, text: `Bookmark ${args.id} ${args.archived ? 'archived' : 'unarchived'}.` }],
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
      const bookmarks = Array.isArray(data) ? data : [];

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

// Autocomplete labels
server.tool(
  'readeck_list_labels',
  'Get list of existing labels (tags) for autocomplete/discovery. Useful for finding available labels before adding them to bookmarks.',
  {
    query: z.string().optional().describe('Optional search query to filter labels (e.g. "tech" to find "tech", "technology", etc.)'),
  },
  async (args) => {
    try {
      const params = new URLSearchParams({
        type: 'label',
        q: args.query ? `*${args.query}*` : '*',
      });

      const labels = await apiRequest(`/api/bookmarks/@complete?${params.toString()}`);

      if (!Array.isArray(labels) || labels.length === 0) {
        return {
          content: [{ type: 'text' as const, text: args.query ? `No labels found matching "${args.query}".` : 'No labels found.' }],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Available labels${args.query ? ` matching "${args.query}"` : ''}:\n${labels.join(', ')}`
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
