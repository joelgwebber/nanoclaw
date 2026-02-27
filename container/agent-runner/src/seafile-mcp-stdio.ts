/**
 * Seafile MCP Server for NanoClaw
 * Provides file operations for Seafile cloud storage
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const SEAFILE_URL = process.env.SEAFILE_URL!;
const SEAFILE_TOKEN = process.env.SEAFILE_TOKEN!;

interface SeafileLibrary {
  id: string;
  name: string;
  type: string;
  owner: string;
  size: number;
  encrypted: boolean;
}

interface SeafileDirEntry {
  id: string;
  name: string;
  type: 'file' | 'dir';
  size?: number;
  mtime?: number;
}

async function seafileRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${SEAFILE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Token ${SEAFILE_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Seafile API error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

const server = new McpServer({
  name: 'seafile',
  version: '1.0.0',
});

server.tool(
  'seafile_list_libraries',
  'List all Seafile libraries (repositories) accessible to the authenticated user',
  {},
  async () => {
    const libraries: SeafileLibrary[] = await seafileRequest('/api2/repos/');

    const formatted = libraries.map(lib =>
      `${lib.name} (${lib.id}) - ${lib.type} - ${(lib.size / 1024 / 1024).toFixed(2)} MB${lib.encrypted ? ' [encrypted]' : ''}`
    ).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: `Libraries:\n${formatted}\n\nTotal: ${libraries.length} libraries`
      }]
    };
  }
);

server.tool(
  'seafile_list_dir',
  'List contents of a directory in a Seafile library',
  {
    library_id: z.string().describe('The library/repository ID'),
    path: z.string().default('/').describe('Directory path (default: /)'),
  },
  async (args) => {
    const encodedPath = encodeURIComponent(args.path);
    const entries: SeafileDirEntry[] = await seafileRequest(
      `/api2/repos/${args.library_id}/dir/?p=${encodedPath}`
    );

    const formatted = entries.map(entry => {
      const icon = entry.type === 'dir' ? '📁' : '📄';
      const size = entry.size ? ` (${(entry.size / 1024).toFixed(2)} KB)` : '';
      return `${icon} ${entry.name}${size}`;
    }).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: `Contents of ${args.path}:\n${formatted}\n\nTotal: ${entries.length} items`
      }]
    };
  }
);

server.tool(
  'seafile_read_file',
  'Read the contents of a file from Seafile',
  {
    library_id: z.string().describe('The library/repository ID'),
    path: z.string().describe('File path'),
  },
  async (args) => {
    // Get download link
    const encodedPath = encodeURIComponent(args.path);
    const downloadUrl = await seafileRequest(
      `/api2/repos/${args.library_id}/file/?p=${encodedPath}`,
      { method: 'GET' }
    );

    // Download file content
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const content = await response.text();

    return {
      content: [{
        type: 'text' as const,
        text: `File: ${args.path}\n\n${content}`
      }]
    };
  }
);

server.tool(
  'seafile_upload_file',
  'Upload or update a file in Seafile',
  {
    library_id: z.string().describe('The library/repository ID'),
    path: z.string().describe('File path (must start with /)'),
    content: z.string().describe('File content'),
    replace: z.boolean().default(false).describe('Replace existing file if it exists'),
  },
  async (args) => {
    // Get upload link
    const uploadUrl = await seafileRequest(
      `/api2/repos/${args.library_id}/upload-link/`,
      { method: 'GET' }
    );

    // Prepare multipart form data
    const formData = new FormData();
    const blob = new Blob([args.content], { type: 'text/plain' });
    const filename = args.path.split('/').pop() || 'file.txt';
    formData.append('file', blob, filename);
    formData.append('parent_dir', args.path.substring(0, args.path.lastIndexOf('/')) || '/');
    if (args.replace) {
      formData.append('replace', '1');
    }

    // Upload file
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${SEAFILE_TOKEN}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.text();

    return {
      content: [{
        type: 'text' as const,
        text: `File uploaded successfully: ${args.path}\n${result}`
      }]
    };
  }
);

server.tool(
  'seafile_create_dir',
  'Create a new directory in Seafile',
  {
    library_id: z.string().describe('The library/repository ID'),
    path: z.string().describe('Directory path to create'),
  },
  async (args) => {
    const encodedPath = encodeURIComponent(args.path);
    await seafileRequest(
      `/api2/repos/${args.library_id}/dir/?p=${encodedPath}`,
      {
        method: 'POST',
        body: JSON.stringify({ operation: 'mkdir' }),
      }
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Directory created: ${args.path}`
      }]
    };
  }
);

server.tool(
  'seafile_delete',
  'Delete a file or directory from Seafile',
  {
    library_id: z.string().describe('The library/repository ID'),
    path: z.string().describe('File or directory path to delete'),
  },
  async (args) => {
    const encodedPath = encodeURIComponent(args.path);
    await seafileRequest(
      `/api2/repos/${args.library_id}/file/?p=${encodedPath}`,
      { method: 'DELETE' }
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Deleted: ${args.path}`
      }]
    };
  }
);

server.tool(
  'seafile_move',
  'Move or rename a file or directory',
  {
    library_id: z.string().describe('The library/repository ID'),
    src_path: z.string().describe('Source path'),
    dst_path: z.string().describe('Destination path'),
  },
  async (args) => {
    const encodedSrc = encodeURIComponent(args.src_path);
    await seafileRequest(
      `/api2/repos/${args.library_id}/file/?p=${encodedSrc}`,
      {
        method: 'POST',
        body: JSON.stringify({
          operation: 'move',
          dst_repo: args.library_id,
          dst_dir: args.dst_path.substring(0, args.dst_path.lastIndexOf('/')) || '/',
        }),
      }
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Moved ${args.src_path} to ${args.dst_path}`
      }]
    };
  }
);

server.tool(
  'seafile_search',
  'Search for files and directories in Seafile',
  {
    query: z.string().describe('Search query'),
    library_id: z.string().optional().describe('Optional: limit search to specific library'),
  },
  async (args) => {
    const params = new URLSearchParams({ q: args.query });
    if (args.library_id) {
      params.append('repo_id', args.library_id);
    }

    const results = await seafileRequest(`/api2/search/?${params.toString()}`);

    const formatted = results.results?.map((r: any) =>
      `${r.is_dir ? '📁' : '📄'} ${r.name} - ${r.repo_name}:${r.fullpath}`
    ).join('\n') || 'No results found';

    return {
      content: [{
        type: 'text' as const,
        text: `Search results for "${args.query}":\n${formatted}\n\nTotal: ${results.total || 0} results`
      }]
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
