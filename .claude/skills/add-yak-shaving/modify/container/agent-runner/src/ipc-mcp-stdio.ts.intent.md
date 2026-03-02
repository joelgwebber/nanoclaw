# MCP Yak Tools Implementation

## What changed

Added MCP wrapper tools for yak operations:

1. **RESPONSES_DIR constant**: Points to `/workspace/ipc/responses/` for reading controller responses
2. **waitForResponse helper**: Polls for response files created after a request timestamp
3. **create_yak tool**: Creates yaks via IPC, waits for response, returns yak ID
4. **list_yaks tool**: Lists yaks via IPC, waits for response, returns formatted list

## Why MCP tools instead of bash IPC?

**User experience**: From Sparky's perspective, yak tools look the same as all other NanoClaw features:
- `mcp__nanoclaw__create_yak(...)` - consistent with `mcp__nanoclaw__schedule_task(...)`
- `mcp__nanoclaw__list_yaks(...)` - consistent with `mcp__nanoclaw__list_tasks()`

**Comparison**:
- **Bash IPC** (old): Agent writes JSON files, sleeps, reads response files
- **MCP tools** (new): Agent calls function, gets immediate response (polling hidden)

## How the polling works

**Pattern**: Request timestamp matching

1. Before writing IPC request, capture `requestTime = Date.now()`
2. Write IPC request to `/workspace/ipc/tasks/`
3. Poll `/workspace/ipc/responses/` every 100ms for up to 2 seconds
4. For each file matching the pattern (e.g., `yak_*.json`):
   - Extract timestamp from filename: `yak_1709234567890.json` → `1709234567890`
   - If `fileTime >= requestTime - 100`, this is our response (100ms buffer for clock skew)
   - Read, delete, return content
5. If no response within 2 seconds, throw timeout error

**Why timestamp matching?**
- Multiple agents could be creating yaks concurrently
- Response files are named with controller's timestamp, not request timestamp
- We need to ensure we read the right response, not a stale one

## Authorization

**create_yak**: Main group only
- Checks `if (!isMain)` before writing IPC request
- Prevents other groups (external users) from creating NanoClaw improvement tasks

**list_yaks**: All groups
- No authorization check (read-only operation)
- Transparency: All groups can see the yak backlog

## Error handling

**create_yak**:
- Returns `isError: true` if not main group
- Returns `isError: true` if controller reports failure (`response.success === false`)
- Returns `isError: true` if polling times out

**list_yaks**:
- Returns empty message if no yaks found (not an error)
- Returns `isError: true` if polling times out

## Response file cleanup

The `waitForResponse` helper deletes response files after reading:
- Prevents reading stale responses on subsequent requests
- Keeps `/workspace/ipc/responses/` directory clean
- Errors during cleanup are silently ignored (file might not exist, permissions, etc.)

## Integration with existing code

**Placement**: After `register_group` tool, before stdio transport startup

**Dependencies**:
- Uses existing `writeIpcFile()` helper
- Uses existing `TASKS_DIR` constant
- Uses existing `isMain` environment variable
- Requires `DATA_DIR` and `IPC_DIR` constants from container context

## Testing

After implementation:

1. Call from agent: `mcp__nanoclaw__create_yak(title="Test", yak_type="task", priority=3, description="...")`
2. Should return: `Yak created: nanoclaw-xxxx - "Test"`
3. Call from agent: `mcp__nanoclaw__list_yaks(status="hairy")`
4. Should return: `Yaks (hairy):\n- [nanoclaw-xxxx] Test (task, p3) - hairy`

## Invariants

1. **Response files are ephemeral**: Deleted after reading, not persisted
2. **Polling is bounded**: 2-second timeout prevents infinite waiting
3. **Main-only creation**: Only main group can create yaks
4. **Synchronous from agent POV**: Agent calls function, gets result (polling hidden)
5. **IPC backend unchanged**: Still uses same src/ipc.ts handlers
