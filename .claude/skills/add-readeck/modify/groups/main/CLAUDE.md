// This file shows the modifications needed for add-readeck skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION: Add Readeck section to CLAUDE.md ==========
// Location: After the WorkFlowy section
// Insert this complete section:

---

## Readeck Bookmark Manager

You have access to Readeck via MCP tools. Readeck is a self-hosted bookmark manager that saves the readable content of web pages for later reading.

### Available Readeck Tools

**mcp__readeck__list_bookmarks**
- List bookmarks with filtering and pagination
- Parameters:
  - `status` (optional): 'unread' | 'archived' | 'all' (default: 'all')
  - `limit` (optional): Max results (default: 20, max: 100)
  - `collection` (optional): Filter by collection name
  - `tag` (optional): Filter by tag
- Returns: Array of bookmark summaries (id, title, URL, status, timestamps)

**mcp__readeck__get_bookmark**
- Get full details of a specific bookmark
- Parameters: `id` (required, bookmark ID)
- Returns: Full bookmark object with excerpt, tags, collection

**mcp__readeck__add_bookmark**
- Save a URL to Readeck for reading later
- Parameters:
  - `url` (required): URL to save
  - `tags` (optional): Comma-separated tag list
  - `collection` (optional): Collection name
- Readeck fetches and parses the content automatically
- Returns: Created bookmark ID

**mcp__readeck__update_bookmark**
- Modify bookmark metadata
- Parameters:
  - `id` (required): Bookmark ID
  - `title` (optional): New title
  - `tags` (optional): Comma-separated tag list (replaces existing)
  - `collection` (optional): Collection name
- At least one of title/tags/collection must be provided
- Returns: Success/failure status

**mcp__readeck__archive_bookmark**
- Move bookmark to archive
- Parameters: `id` (required, bookmark ID)
- Returns: Success/failure status

**mcp__readeck__delete_bookmark**
- Permanently remove a bookmark
- Parameters: `id` (required, bookmark ID)
- Returns: Success/failure status

**mcp__readeck__search_bookmarks**
- Full-text search across bookmark content
- Parameters:
  - `query` (required): Search string
  - `limit` (optional): Max results (default: 20)
- Searches titles, excerpts, and URLs
- Returns: Matching bookmarks with excerpts

### Usage Examples

**Save a bookmark**:
```
mcp__readeck__add_bookmark(url="https://example.com/article", tags="tech,tutorial", collection="Learning")
```

**List unarchived bookmarks**:
```
mcp__readeck__list_bookmarks(status="unread", limit=10)
```

**Search for content**:
```
mcp__readeck__search_bookmarks(query="python tutorial", limit=5)
```

**Update bookmark tags**:
```
mcp__readeck__update_bookmark(id="abc123", tags="ai,machine-learning,updated")
```

**Archive bookmark**:
```
mcp__readeck__archive_bookmark(id="abc123")
```

**Get full details**:
```
mcp__readeck__get_bookmark(id="abc123")
```

### When to Use Readeck

- User asks to "save this for later", "bookmark this", "add to reading list"
- User wants to search previously saved articles
- User wants to organize bookmarks with tags or collections
- User wants to archive old bookmarks

### Best Practices

1. **Always search first** - Before adding a bookmark, search to avoid duplicates
2. **Use descriptive tags** - Help organize bookmarks with relevant tags
3. **Collections for grouping** - Use collections for larger topic groupings
4. **Archive when done** - Archive bookmarks after reading to keep active list clean

