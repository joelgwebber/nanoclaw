---
name: add-yak-shaving
description: Enable agents to create and query yaks via IPC for self-improvement suggestions
---

# Add Yak Shaving Capability

This skill enables Sparky (the main channel agent) to suggest improvements to NanoClaw by creating yaks (tasks) via MCP tools. It provides:
- **mcp__nanoclaw__create_yak**: Agent-initiated yak creation with approval workflow
- **mcp__nanoclaw__list_yaks**: Query existing yaks to avoid duplicates
- **IPC backend**: Tools write IPC requests, poll for responses, return results seamlessly

## Phase 1: Pre-flight

### Check if already integrated

Check if yak-shaving is already configured:

```bash
grep -q "create_yak" src/ipc.ts && echo "IPC handlers integrated" || echo "IPC handlers not integrated"
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

### 1. Modify src/ipc.ts

Apply changes from `modify/src/ipc.ts`:

**Interface update** (around line 173-181):
- Add `title?`, `yak_type?`, `priority?`, `description?`, `parent?` fields
- Add `status?` field for list_yaks

**Add create_yak handler** (after register_group case):
- Authorization: Only main group (`if (!isMain)`)
- Executes `yak.py create` on host
- Writes response to `data/ipc/{sourceGroup}/responses/yak_{timestamp}.json`
- Returns `{success: true, yak_id, ...}` or `{success: false, error, ...}`

**Add list_yaks handler** (after create_yak case):
- Executes `yak.py list --json --status {status}`
- Writes response to `data/ipc/{sourceGroup}/responses/list_yaks_{timestamp}.json`
- No authorization check (all groups can list)

See `modify/src/ipc.ts.intent.md` for detailed implementation notes.

### 2. Modify container/agent-runner/src/ipc-mcp-stdio.ts

Apply changes from `modify/container/agent-runner/src/ipc-mcp-stdio.ts`:

**Add RESPONSES_DIR constant**:
```typescript
const RESPONSES_DIR = path.join(IPC_DIR, 'responses');
```

**Add waitForResponse helper**:
- Polls for response files matching a pattern
- Extracts timestamp from filename, only returns files created after request
- Cleans up response file after reading

**Add MCP tools**:
- `server.tool('create_yak', ...)` - Authorization check, writes IPC, waits for response, returns yak ID
- `server.tool('list_yaks', ...)` - Writes IPC, waits for response, returns formatted list

See `modify/container/agent-runner/src/ipc-mcp-stdio.ts.intent.md` for detailed implementation notes.

### 3. Sync agent runner source

```bash
./scripts/update-agent-source.sh
```

This syncs the modified `container/agent-runner/src/` files to the bind mount where the container compiles them at runtime.

### 4. Build TypeScript

```bash
npm run build
```

### 5. Restart service

```bash
# Linux
systemctl --user restart nanoclaw

# macOS
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

### 6. Update groups/main/CLAUDE.md

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

### Check Logs if Needed

```bash
tail -f logs/nanoclaw.log | grep -i "yak"
```

Look for:
- `Yak created via IPC` with yak ID
- `Yaks listed via IPC` with status filter

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
5. **Controller**: Reads task, validates, executes `yak.py create` on host
6. **Controller**: Writes response to `data/ipc/main/responses/yak_{timestamp}.json`
7. **MCP Server**: Detects response file, reads it, deletes it, returns to agent
8. **Agent**: Receives yak ID immediately (synchronous from agent's perspective)

### Authorization Model

- **create_yak**: Main group only (`if (!isMain)`)
  - Prevents other groups from creating yaks
  - Other groups are for external users, shouldn't modify NanoClaw itself
- **list_yaks**: All groups (no check)
  - Read-only operation
  - Useful for transparency across groups

### Why Not Direct .yaks/ Access?

Agent has read access to `/workspace/project/.yaks/` but:
1. **Read-only mount**: Can't write new yaks
2. **No yak.py**: Script not available in container
3. **IPC provides feedback**: Response files give immediate confirmation with yak ID
4. **Future-proof**: If we move .yaks/ outside project root, IPC still works

## Removal

To remove this capability:

1. Remove create_yak and list_yaks cases from `src/ipc.ts`
2. Remove yak fields from processTaskIpc interface
3. Remove "Suggesting Improvements" section from `groups/main/CLAUDE.md`
4. Rebuild and restart:
   ```bash
   npm run build
   systemctl --user restart nanoclaw  # or launchctl kickstart for macOS
   ```
5. Optionally keep yaks created through this skill - they're just regular tasks

## References

- Yaks plugin: https://github.com/anthropics/yaks-marketplace
- IPC pattern: See src/ipc.ts (register_group, schedule_task examples)
- Container mounts: See src/container-runner.ts (lines 65-173)
