---
name: add-yak-shaving
description: Enable agents to create and query yaks via IPC for self-improvement suggestions
---

# Add Yak Shaving Capability

This skill enables Sparky (the main channel agent) to manage yaks (tasks) for tracking NanoClaw improvements via MCP tools. It provides full yak workflow support:

**Yak Management Tools**:
- **mcp__nanoclaw__create_yak**: Create new yaks with approval workflow
- **mcp__nanoclaw__list_yaks**: Query existing yaks to avoid duplicates
- **mcp__nanoclaw__show_yak**: Get full details of a specific yak
- **mcp__nanoclaw__update_yak**: Modify yak metadata (title, type, priority, description)

**Yak Workflow Tools**:
- **mcp__nanoclaw__shave_yak**: Start working (hairy → shearing)
- **mcp__nanoclaw__shorn_yak**: Mark complete (shearing → shorn)
- **mcp__nanoclaw__regrow_yak**: Reopen (shorn → hairy)
- **mcp__nanoclaw__dep_yak**: Manage dependencies (add/remove)

**Architecture**: MCP tools write IPC requests to `data/ipc/main/tasks/`, backend handlers in `src/yak-ipc.ts` execute yak.py commands, responses written to `data/ipc/main/responses/`, MCP tools poll and return results seamlessly.

## Phase 1: Pre-flight

### Check if already integrated

Check if yak-shaving is already configured:

```bash
test -f src/yak-ipc.ts && echo "Yak IPC handlers exist" || echo "Yak IPC handlers missing"
grep -q "handleYakIpc" src/ipc.ts && echo "IPC dispatcher integrated" || echo "IPC dispatcher not integrated"
grep -q "'create_yak'" container/agent-runner/src/ipc-mcp-stdio.ts && echo "MCP tools integrated" || echo "MCP tools not integrated"
grep -q "## Suggesting Improvements" groups/main/CLAUDE.md && echo "Guidance added" || echo "Guidance not added"
```

If all show integrated, skip to Phase 3 (Verify).

### Prerequisites

Verify Yaks plugin is installed:

```bash
ls ~/.claude/plugins/cache/yaks-marketplace/yaks/*/scripts/yak.py || echo "Yaks plugin not installed"
```

If not installed, run `/yaks:init` or install the Yaks plugin first.

## Phase 2: Apply Code Changes

### 1. Create src/yak-ipc.ts

Create new file `src/yak-ipc.ts` with dedicated yak handlers:

**Exports**:
- `handleYakIpc(data, sourceGroup, isMain)` - Dispatcher for all yak operations
- `YakIpcData` interface - Type definition for yak IPC data

**Handlers** (see `modify/src/yak-ipc.ts` for reference implementation):
- `handleCreateYak` - Create yaks (main-only)
- `handleListYaks` - List yaks by status
- `handleShowYak` - Get yak details
- `handleUpdateYak` - Update yak metadata (main-only)
- `handleShaveYak` - Start shaving (main-only)
- `handleShornYak` - Mark complete (main-only)
- `handleRegrowYak` - Reopen (main-only)
- `handleDepYak` - Manage dependencies (main-only)

**Helper functions**:
- `execYak(args)` - Execute yak.py commands
- `writeYakResponse(sourceGroup, type, data)` - Write IPC response files

### 2. Modify src/ipc.ts

**Import yak handler**:
```typescript
import { handleYakIpc } from './yak-ipc.js';
```

**Update processTaskIpc interface** (add yak fields around line 174-186):
- `title?`, `yak_type?`, `priority?`, `description?`, `parent?`
- `status?`, `yak_id?`
- `new_title?`, `new_type?`, `new_priority?`, `new_description?`
- `dep_action?`, `dep_id?`

**Replace yak case statements** (around line 392-538):
```typescript
case 'create_yak':
case 'list_yaks':
case 'show_yak':
case 'update_yak':
case 'shave_yak':
case 'shorn_yak':
case 'regrow_yak':
case 'dep_yak':
  await handleYakIpc(data, sourceGroup, isMain);
  break;
```

See `modify/src/ipc.ts.intent.md` for detailed refactoring notes.

### 3. Modify container/agent-runner/src/ipc-mcp-stdio.ts

Apply changes from `modify/container/agent-runner/src/ipc-mcp-stdio.ts`:

**Add RESPONSES_DIR constant** (if not already present):
```typescript
const RESPONSES_DIR = path.join(IPC_DIR, 'responses');
```

**Add waitForResponse helper** (if not already present):
- Polls for response files matching a pattern
- Extracts timestamp from filename, only returns files created after request
- Cleans up response file after reading

**Add/Update MCP tools** (before stdio transport):
- `server.tool('create_yak', ...)` - Create yaks with parent support
- `server.tool('list_yaks', ...)` - List yaks by status
- `server.tool('show_yak', ...)` - Get yak details
- `server.tool('update_yak', ...)` - Update title/type/priority/description
- `server.tool('shave_yak', ...)` - Start working (hairy → shearing)
- `server.tool('shorn_yak', ...)` - Mark complete (shearing → shorn)
- `server.tool('regrow_yak', ...)` - Reopen (shorn → hairy)
- `server.tool('dep_yak', ...)` - Add/remove dependencies

All main-only tools (except list_yaks and show_yak) check `if (!isMain)` before proceeding.

See `modify/container/agent-runner/src/ipc-mcp-stdio.ts.intent.md` for detailed implementation notes.

### 4. Sync agent runner source

```bash
./scripts/update-agent-source.sh
```

This syncs the modified `container/agent-runner/src/` files to the bind mount where the container compiles them at runtime.

### 5. Build TypeScript

```bash
npm run build
```

### 6. Restart service

```bash
# Linux
systemctl --user restart nanoclaw

# macOS
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

### 7. Update groups/main/CLAUDE.md

Add the "Suggesting Improvements" section from `modify/groups/main/CLAUDE.md`.

Insert after existing content, before "Scheduling for Other Groups" section (if it exists), or at the end.

See `modify/groups/main/CLAUDE.md.intent.md` for detailed guidance.

## Phase 3: Verify

### Test Integration

Send a message to Sparky in the main channel:

```
@Sparky what improvements would you suggest for NanoClaw?
```

Sparky should:
1. Check existing hairy yaks via `mcp__nanoclaw__list_yaks(status="hairy")`
2. Propose 2-3 improvements with detailed context
3. Ask for approval before creating yaks

### Approve a Suggestion

When Sparky proposes a yak, approve it. Sparky should:
1. Call `mcp__nanoclaw__create_yak(...)` with the proposed details
2. Receive immediate response with yak ID
3. Report back with yak ID (e.g., "Yak created! (nanoclaw-XXXX)")

### Verify Yak Created

```bash
python3 ~/.claude/plugins/cache/yaks-marketplace/yaks/0.1.1/scripts/yak.py list --status hairy | grep -i "the title you suggested"
```

### Test Yak Workflow Tools

Test the full yak workflow with Sparky:

1. **List yaks**: `@Sparky list all hairy yaks`
2. **Show details**: `@Sparky show me details of yak nanoclaw-XXXX`
3. **Start work**: `@Sparky shave yak nanoclaw-XXXX` (should move to shearing)
4. **Check status**: List shearing yaks to verify
5. **Complete**: `@Sparky mark yak nanoclaw-XXXX as shorn`
6. **Verify**: List shorn yaks to confirm
7. **Reopen** (optional): `@Sparky regrow yak nanoclaw-XXXX` (moves back to hairy)
8. **Dependencies** (optional): `@Sparky add dependency: yak nanoclaw-AAAA depends on nanoclaw-BBBB`
9. **Update** (optional): `@Sparky update yak nanoclaw-XXXX to have priority 1`

### Check Logs if Needed

```bash
tail -f logs/nanoclaw.log | grep -i "yak"
```

Look for:
- `Yak created via IPC` with yak ID
- `Yaks listed via IPC` with status filter
- `Yak shown via IPC` with yak ID
- `Yak updated via IPC` with yak ID
- `Yak shaved via IPC` with yak ID
- `Yak marked as shorn via IPC` with yak ID
- `Yak regrown via IPC` with yak ID
- `Yak dependency managed via IPC` with yak IDs and action

## Troubleshooting

### "Unauthorized create_yak attempt blocked"

**Cause**: Non-main group tried to create a yak.

**Fix**: create_yak is restricted to main group only. This is intentional to prevent other groups from spamming the yak backlog.

### "Invalid create_yak request - missing required fields"

**Cause**: IPC message missing title, yak_type, priority, or description.

**Fix**: Ensure the IPC message has all required fields:
```json
{
  "type": "create_yak",
  "title": "...",
  "yak_type": "bug|feature|task",
  "priority": 1,
  "description": "..."
}
```

### "yaks: error: argument --priority: invalid int value: 'p2'"

**Cause**: Priority sent as string "p1"/"p2"/"p3" instead of numeric 1/2/3.

**Fix**: Use numeric priorities in IPC messages: `"priority": 2` not `"priority": "p2"`

### "yaks: error: unrecognized arguments: --format json"

**Cause**: Using `--format json` instead of `--json` flag.

**Fix**: Use `--json` flag: `yak.py list --json`

### Response file not created

**Cause 1**: Wrong response file path (using `data/sessions/{group}/ipc/responses/` instead of `data/ipc/{group}/responses/`)

**Fix**: Verify the response file path in src/ipc.ts:
```typescript
const responseFile = path.join(
  DATA_DIR,      // 'data/'
  'ipc',         // NOT 'sessions'
  sourceGroup,   // e.g., 'main'
  'responses',
  `yak_${Date.now()}.json`,
);
```

**Cause 2**: IPC watcher not running

**Fix**: Check logs for "IPC watcher started":
```bash
tail logs/nanoclaw.log | grep "IPC watcher"
```

### Agent doesn't check for duplicates

**Cause**: Missing "Step 0: Check for duplicates" guidance in CLAUDE.md.

**Fix**: Ensure the "Suggesting Improvements" section includes the list_yaks example workflow.

### Agent suggests too many improvements

**Cause**: Missing rate limiting constraints in CLAUDE.md.

**Fix**: Ensure "Constraints" section includes "Maximum 1 suggestion per conversation" rule.

## How It Works

### Container Mounts

**Main group container sees**:
- `/workspace/project/.yaks/` → Can READ all yaks (read-only mount)
- `/workspace/ipc/tasks/` → Can WRITE IPC requests (read-write mount)
- `/workspace/ipc/responses/` → Can READ IPC responses (read-write mount)

**Main group container CANNOT**:
- Write to `.yaks/` (read-only mount)
- Execute `yak.py` (not installed in container, lives at `~/.claude/plugins/` on host)

### MCP Tool Flow

1. **Agent**: Calls `mcp__nanoclaw__create_yak(...)` MCP tool
2. **MCP Server** (in container): Writes `data/ipc/main/tasks/create_yak_{timestamp}.json`
3. **MCP Server**: Polls `/workspace/ipc/responses/` for response file (every 100ms, 2s timeout)
4. **Controller** (on host): Polls IPC directory every 1 second (IPC_POLL_INTERVAL)
5. **Controller**: Reads task via `processTaskIpc()` in src/ipc.ts
6. **Dispatcher**: Routes yak operations to `handleYakIpc()` in src/yak-ipc.ts
7. **Yak Handler**: Validates, executes `yak.py` command on host (e.g., `create`, `list`, `shave`, etc.)
8. **Yak Handler**: Writes response to `data/ipc/main/responses/{operation}_{timestamp}.json`
9. **MCP Server**: Detects response file, reads it, deletes it, returns to agent
10. **Agent**: Receives result immediately (synchronous from agent's perspective)

### Authorization Model

**Main-only operations** (require `if (!isMain)` check):
- **create_yak**: Create new yaks
- **update_yak**: Modify yak metadata
- **shave_yak**: Start working (hairy → shearing)
- **shorn_yak**: Mark complete (shearing → shorn)
- **regrow_yak**: Reopen (shorn → hairy)
- **dep_yak**: Manage dependencies

**All groups** (no authorization check):
- **list_yaks**: List yaks by status (read-only)
- **show_yak**: Get yak details (read-only)

**Rationale**: Other groups are for external users who shouldn't modify NanoClaw's development backlog. Read operations are allowed for transparency.

### Why Not Direct .yaks/ Access?

Agent has read access to `/workspace/project/.yaks/` but:
1. **Read-only mount**: Can't write new yaks
2. **No yak.py**: Script not available in container
3. **IPC provides feedback**: Response files give immediate confirmation with yak ID
4. **Future-proof**: If we move .yaks/ outside project root, IPC still works

## Removal

To remove this capability:

1. Delete `src/yak-ipc.ts`
2. Remove `import { handleYakIpc } from './yak-ipc.js'` from `src/ipc.ts`
3. Remove yak case statements from `src/ipc.ts` processTaskIpc switch
4. Remove yak fields from processTaskIpc interface
5. Remove all yak MCP tools from `container/agent-runner/src/ipc-mcp-stdio.ts`
6. Remove "Suggesting Improvements" and "Available Yak Tools" sections from `groups/main/CLAUDE.md`
7. Sync, rebuild, and restart:
   ```bash
   ./scripts/update-agent-source.sh
   npm run build
   systemctl --user restart nanoclaw  # or launchctl kickstart for macOS
   ```
8. Optionally keep yaks created through this skill - they're just regular tasks in .yaks/

## References

- Yaks plugin: https://github.com/anthropics/yaks-marketplace
- IPC pattern: See src/ipc.ts (register_group, schedule_task examples)
- Container mounts: See src/container-runner.ts (lines 65-173)
- Yak handlers: See src/yak-ipc.ts (refactored handlers for all yak operations)
