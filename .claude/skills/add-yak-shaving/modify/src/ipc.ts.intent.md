# Intent: src/ipc.ts modifications

## What changed

Added IPC handlers for agent-created yaks with introspection capabilities:
1. **create_yak**: Agent can create yaks via IPC, gets confirmation with yak ID
2. **list_yaks**: Agent can list yaks by status (hairy/shearing/shorn/all)

## Key sections

### processTaskIpc interface (around line 173-181)

Added to the `data` parameter:
```typescript
// For create_yak
title?: string;
yak_type?: string;
priority?: number;
description?: string;
parent?: string;
// For list_yaks
status?: string; // 'hairy' | 'shearing' | 'shorn' | 'all'
```

### create_yak handler (after register_group case, before default)

- **Authorization**: Only main group can create yaks (`if (!isMain)`)
- **Creates yak**: Executes `yak.py create` on host with proper escaping
- **Response file**: Writes to `data/ipc/{sourceGroup}/responses/yak_{timestamp}.json`
  - Success: Returns `{success: true, yak_id, title, type, priority, created}`
  - Error: Returns `{success: false, error, title}`
- **Path fix**: Uses `DATA_DIR/ipc/sourceGroup/responses/` NOT `DATA_DIR/sessions/...`

### list_yaks handler (after create_yak case, before default)

- **No authorization check**: Any group can list yaks (design decision)
- **Lists yaks**: Executes `yak.py list --json` with optional `--status` filter
- **Response file**: Writes raw JSON to `data/ipc/{sourceGroup}/responses/list_yaks_{timestamp}.json`
- **Status values**: `hairy`, `shearing`, `shorn`, or `all` (omit for all)
- **Client-side filtering**: Keyword search not supported by yak.py, agent can filter JSON

## Invariants

- All existing IPC handlers (schedule_task, register_group, etc.) are unchanged
- IPC watcher polling (IPC_POLL_INTERVAL = 1s) is unchanged
- IPC directory structure (`data/ipc/{group}/tasks/`) is unchanged
- Error handling pattern (try/catch with logging) is preserved
- execSync command escaping pattern is preserved

## Must-keep

- The `isMain` authorization check for create_yak
- The `DATA_DIR` import and usage for paths
- The yak.py script path resolution using `process.env.HOME`
- The regex pattern for extracting yak ID: `/Created (nanoclaw-[a-f0-9]+):/`
- The `fs.mkdirSync(path.dirname(responseFile), { recursive: true })` pattern
- JSON formatting with 2-space indent for response files

## Why IPC instead of direct .yaks/ access?

- Agent has READ-ONLY access to `/workspace/project/.yaks/` (can list existing)
- Agent CANNOT write to .yaks/ (read-only mount)
- Agent CANNOT execute yak.py (not installed in container, lives at `~/.claude/plugins/`)
- IPC allows controller to execute host commands on agent's behalf
- Response files provide immediate feedback to agent
