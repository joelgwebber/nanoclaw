# Intent: container/agent-runner/src/seafile-mcp-stdio.ts

## What this file does

**Full MCP server implementation** for Seafile cloud storage integration with hybrid local/API access.

## Why this approach

Seafile is a cloud storage platform with both a web API and a local sync client (`seaf-cli`). This implementation uses a **hybrid access strategy**:

1. **Local-first**: Try to read from `/workspace/seafile` (mounted seaf-cli sync directory)
2. **API fallback**: If file not found locally, fetch from Seafile API

This provides the best of both worlds: fast local reads when available, with full cloud coverage via API.

## Architecture decisions

### 1. Hybrid Access Pattern

```typescript
async function tryReadLocal(libraryId: string, filePath: string): Promise<string | null>
async function tryListDirLocal(libraryId: string, dirPath: string): Promise<SeafileDirEntry[] | null>
```

**Why**: Many users have `seaf-cli` syncing common libraries to local disk. For these files, reading locally is 100x faster than API calls. But local sync is incomplete (not all libraries, not all files), so API fallback ensures full coverage.

**Implementation**:
- Check `SEAFILE_LOCAL_PATH` environment variable
- Map library ID → library name via cache
- Construct path: `{base}/{library_name}/{library_name}/{file_path}` (seaf-cli structure)
- If local file exists and readable, return immediately
- Otherwise, return null and caller falls back to API

### 2. Library Name Caching

```typescript
let libraryCache: Map<string, string> | null = null;
```

**Why**: Seafile APIs use library IDs (UUIDs), but local paths use library names. To map between them, we fetch the library list once and cache the ID→name mapping.

**Trade-off**: Cache never invalidates during process lifetime. If user renames a library, local reads will fail (but API still works). Acceptable because renaming is rare.

### 3. Nine Tools (Complete CRUD + Extras)

| Tool | Purpose |
|------|---------|
| `seafile_list_libraries` | Discover available repos |
| `seafile_list_dir` | Browse directory contents |
| `seafile_read_file` | Read file content (hybrid) |
| `seafile_upload_file` | Create/update files |
| `seafile_create_dir` | Create directories |
| `seafile_delete` | Delete files/dirs |
| `seafile_move` | Move/rename operations |
| `seafile_search` | Search by name |
| `seafile_create_share_link` | Generate shareable download URLs |

**Why 9 tools?**: Complete file management requires CRUD (create, read, update, delete) plus navigation (list, search), organization (move), and sharing (links). Less would be incomplete; more would be redundant.

### 4. Share Link Tool (Special Case)

```typescript
const downloadLink = link ? `${link}?dl=1` : '';
```

**Why**: WhatsApp and other messaging apps can't display Seafile files directly. The agent needs to generate shareable download links for images, PDFs, etc.

**Key detail**: Append `?dl=1` to force direct download instead of showing Seafile's web viewer. This lets images display inline in messaging apps.

**When to use**: "Show me my insurance card" → agent creates share link → user clicks link → image displays.

### 5. Local Path Structure

```typescript
// seaf-cli creates: {base}/{library_name}/{library_name}/...
path.join(SEAFILE_LOCAL_PATH, libraryName, libraryName, filePath)
```

**Why the double library name?**: This is seaf-cli's directory structure. It puts synced libraries at `{base}/{library_name}/`, then inside that directory, the root is `{library_name}/`. Weird, but we must match it.

## Environment variables

- `SEAFILE_URL` (required): Base URL of Seafile instance (e.g., `https://seafile.example.com`)
- `SEAFILE_TOKEN` (required): API token from Seafile account settings
- `SEAFILE_LOCAL_PATH` (optional): Path to seaf-cli synced libraries (e.g., `/workspace/seafile`)

If `SEAFILE_LOCAL_PATH` not set, all operations use API (slower but works).

## Error handling

**API errors**: Throw with HTTP status code and response body. Caller (Agent SDK) will show error to user.

**Local read failures**: Return `null` and fall back to API silently. User doesn't need to know whether read was local or remote.

**Missing credentials**: Will crash on first API call with clear error message.

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Runtime schema validation for tool parameters
- `fs/promises` - Async filesystem operations (for local reads)
- `path` - Path manipulation (for local reads)
- `fetch` - HTTP client (for API calls)

## Testing approach

1. **Unit testing**: Not included. Complex to mock Seafile API and filesystem.
2. **Integration testing**: Manual testing via agent queries in production.
3. **Validation**: TypeScript + Zod catch most bugs before runtime.

**Why no tests?**: This is a thin wrapper around Seafile API. Most bugs manifest as API errors (which are clear) or tool schema mismatches (which Zod catches). Cost/benefit doesn't justify test infrastructure.

## Known limitations

- **Library-scoped operations**: Can't move files between different libraries (Seafile API limitation)
- **Text files only for read_file**: Binary files should use share links
- **No real-time sync**: Changes in Seafile don't trigger notifications
- **Local path structure assumptions**: Hardcoded for seaf-cli directory layout
- **Cache invalidation**: Library name cache never refreshes

## Future improvements (not implemented)

- **Streaming large files**: Currently loads entire file into memory
- **Batch operations**: Upload/delete multiple files at once
- **Directory sync status**: Expose which libraries are synced locally
- **Content search**: Seafile supports full-text search, but not exposed here
- **Version history**: Seafile tracks file versions, but not exposed here

None of these were needed for initial use cases.
