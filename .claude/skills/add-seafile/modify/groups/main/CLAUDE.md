---

## Seafile Cloud Storage

You have access to Seafile cloud storage at https://files.j15r.com via MCP tools. Seafile provides file storage and sharing capabilities.

### Hybrid Local/API Access

The Seafile MCP server uses a hybrid approach:
1. **Local filesystem first**: Checks `/workspace/seafile` for files (fast, no network)
2. **API fallback**: Uses Seafile API if file not found locally (slower, but comprehensive)

This provides best-of-both-worlds: fast access to commonly used files, with full cloud coverage.

### Available Seafile Tools

**mcp__seafile__seafile_list_libraries**
- List all libraries (repositories) in your Seafile account
- No parameters required
- Returns library IDs, names, and types

**mcp__seafile__seafile_list_dir**
- List files and directories in a library
- Parameters: `library_id` (required), `path` (optional, default: "/")
- Returns entries with names, types, sizes, and modification times

**mcp__seafile__seafile_read_file**
- Read a file's content
- Parameters: `library_id`, `path`
- Uses hybrid access: local filesystem first, then API
- Best for text files (code, markdown, config, etc.)

**mcp__seafile__seafile_upload_file**
- Upload or update a file
- Parameters: `library_id`, `path`, `content`, `replace` (optional, default: false)
- Creates parent directories automatically if needed

**mcp__seafile__seafile_create_dir**
- Create a new directory
- Parameters: `library_id`, `path`
- Creates parent directories automatically

**mcp__seafile__seafile_delete**
- Delete a file or directory
- Parameters: `library_id`, `path`
- Permanently deletes the item

**mcp__seafile__seafile_move**
- Move or rename a file/directory
- Parameters: `library_id`, `src_path`, `dst_path`
- Can move between directories in the same library

**mcp__seafile__seafile_search**
- Search for files and directories
- Parameters: `query`, `library_id` (optional)
- Searches file/directory names (not content)

**mcp__seafile__seafile_create_share_link**
- Create a shareable download link for a file
- Parameters: `library_id`, `path`, `password` (optional), `expire_days` (optional)
- Returns a URL that can be shared with others to download the file
- Links automatically include `?dl=1` for direct download (not web viewer)
- Use this when you need to provide access to images, documents, or any binary files

### When to Use Share Links vs. Reading Files

**Use `seafile_read_file`** for:
- Text files that can be displayed directly (txt, md, csv, code, etc.)
- Files you need to process or analyze

**Use `seafile_create_share_link`** for:
- Images (png, jpg, gif, etc.) - user can click the link to view
- Documents (pdf, docx, etc.)
- Binary files or anything you want the user to download
- When the user asks to "see" or "show" a file (e.g., "show me my insurance card")

### Usage Examples

```
List all libraries:
mcp__seafile__seafile_list_libraries

List files in a directory:
mcp__seafile__seafile_list_dir(library_id="abc123", path="/Documents")

Read a file:
mcp__seafile__seafile_read_file(library_id="abc123", path="/Documents/notes.txt")

Upload a file:
mcp__seafile__seafile_upload_file(library_id="abc123", path="/Documents/report.md", content="# Report\n\nContent here...")

Create a shareable link (e.g., for "show me my insurance card"):
mcp__seafile__seafile_create_share_link(library_id="abc123", path="/Personal/insurance_card.png")

Create a password-protected link that expires in 7 days:
mcp__seafile__seafile_create_share_link(library_id="abc123", path="/Documents/confidential.pdf", password="secret123", expire_days=7)

Search for files:
mcp__seafile__seafile_search(query="budget", library_id="abc123")

Move a file:
mcp__seafile__seafile_move(library_id="abc123", src_path="/old/file.txt", dst_path="/new/file.txt")
```
