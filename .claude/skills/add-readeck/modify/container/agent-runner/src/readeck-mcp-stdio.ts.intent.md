# Intent: container/agent-runner/src/readeck-mcp-stdio.ts (NEW FILE)

## What this file is

**NEW** MCP server providing Readeck bookmark manager integration via REST API.

## What it exports

Main server process that exposes 7 MCP tools for bookmark management:

- `list_bookmarks` - Query bookmarks with filters
- `get_bookmark` - Get full details of a bookmark
- `add_bookmark` - Save URL to Readeck
- `update_bookmark` - Modify bookmark metadata
- `archive_bookmark` - Move to archive
- `delete_bookmark` - Remove bookmark
- `search_bookmarks` - Full-text search

## Architecture

### API Communication

- Base URL from `READECK_URL` environment variable
- Authentication via `READECK_API_KEY` Bearer token
- Two request types:
  - `apiRequest()` - JSON API calls (GET/POST/PUT/DELETE)
  - `formRequest()` - Form-encoded requests (POST/PATCH) for updates

### Data Model

```typescript
interface ReadeckBookmark {
  id: string;              // Unique identifier
  url: string;             // Original URL
  title: string;           // Page title
  is_archived: boolean;    // Archive status
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
  excerpt?: string;        // First paragraph
  tags?: string[];         // Tag array
  collection?: string;     // Collection name
}
```

### Status Derivation

Readeck's API doesn't have a separate "status" field. We compute it client-side:

```typescript
function getStatus(bookmark: ReadeckBookmark): 'archived' | 'unread' {
  return bookmark.is_archived ? 'archived' : 'unread';
}
```

## Tool Details

### list_bookmarks
**Purpose**: Query bookmarks with optional filters
**Parameters**:
- `status` (optional): 'unread' | 'archived' | 'all' (default: 'all')
- `limit` (optional): Max results (default: 20, max: 100)
- `collection` (optional): Filter by collection name
- `tag` (optional): Filter by tag

**Implementation**:
- Maps status to `is_archived` query param
- Returns array of bookmark summaries (id, title, URL, status, timestamps)

### get_bookmark
**Purpose**: Get full details including content
**Parameters**:
- `id` (required): Bookmark ID

**Returns**: Full bookmark object with excerpt, tags, collection

### add_bookmark
**Purpose**: Save new URL to Readeck
**Parameters**:
- `url` (required): URL to save
- `tags` (optional): Comma-separated tag list
- `collection` (optional): Collection name

**Implementation**:
- POST to `/api/bookmarks` with JSON body
- Readeck fetches and parses the page
- Returns created bookmark ID

### update_bookmark
**Purpose**: Modify bookmark metadata
**Parameters**:
- `id` (required): Bookmark ID
- `title`, `tags`, `collection` (at least one required)

**Implementation**:
- Uses form-encoded PATCH request (Readeck API requirement)
- Only sends provided fields
- Returns success/failure

### archive_bookmark / delete_bookmark
**Purpose**: Archive or permanently remove
**Parameters**:
- `id` (required): Bookmark ID

**Implementation**:
- archive: POST `/api/bookmarks/{id}/archive`
- delete: DELETE `/api/bookmarks/{id}`

### search_bookmarks
**Purpose**: Full-text search across bookmark content
**Parameters**:
- `query` (required): Search string
- `limit` (optional): Max results (default: 20)

**Returns**: Matching bookmarks with excerpts

## Error Handling

All tools wrap API calls in try/catch:

```typescript
try {
  const result = await apiRequest(...);
  return { content: [{ type: 'text', text: result }] };
} catch (err) {
  return {
    content: [{ type: 'text', text: `Error: ${err.message}` }],
    isError: true
  };
}
```

## Environment Variables

Required:
- `READECK_URL` - Base URL (e.g., `https://readeck.example.com`)
- `READECK_API_KEY` - Bearer token from Readeck Profile → API Token

Validation:
- Exits with error if either is missing
- Strips trailing slash from URL

## Integration Pattern

Follows standard NanoClaw MCP server pattern:

1. Import MCP SDK components
2. Define API helpers and types
3. Create server instance
4. Register tools with zod schemas
5. Start stdio transport

## Why Readeck?

- Self-hosted alternative to Pocket/Instapaper
- Saves readable content, not just links
- Full-text search across saved pages
- Privacy-focused (no tracking)
- REST API for programmatic access

## Trade-offs

**Form-encoded updates**: The Readeck API requires `application/x-www-form-urlencoded` for PATCH requests, while GET/POST use JSON. This is why we have two request helpers.

**No bulk operations**: API doesn't support batch operations, so multiple updates require multiple calls.

**Status field**: Computed client-side from `is_archived` flag. Future Readeck updates might add native status field.
