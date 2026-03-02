# Intent: src/yak-ipc.ts (NEW FILE)

## What this file is

**NEW** dedicated module for all yak IPC operations, extracted from src/ipc.ts for better code organization.

## What it exports

### Main export

```typescript
export async function handleYakIpc(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void>
```

Dispatcher that routes yak operations to appropriate handlers based on `data.type`.

### Type export

```typescript
export interface YakIpcData {
  type: string;
  // ... all yak-related fields
}
```

## Architecture

### File structure

```
src/yak-ipc.ts
├── Constants
│   └── YAK_SCRIPT_PATH: Path to yak.py
├── Helper functions
│   ├── writeYakResponse(): Write response files
│   └── execYak(): Execute yak.py commands
├── Main dispatcher
│   └── handleYakIpc(): Route to specific handlers
└── Individual handlers (8 total)
    ├── handleCreateYak()
    ├── handleListYaks()
    ├── handleShowYak()
    ├── handleUpdateYak()
    ├── handleShaveYak()
    ├── handleShornYak()
    ├── handleRegrowYak()
    └── handleDepYak()
```

### Handler pattern

All handlers follow the same pattern:

1. **Validate** required fields
2. **Check authorization** (main-only operations)
3. **Execute** yak.py command via `execYak()`
4. **Write response** file via `writeYakResponse()`
5. **Log** success/failure

## Operations

### Read operations (no auth check)

**list_yaks**:
- Lists yaks filtered by status (hairy/shearing/shorn/all)
- Executes: `yak.py list --json [--status STATUS]`
- Response: Raw JSON array from yak.py

**show_yak**:
- Gets full details of a specific yak
- Executes: `yak.py show --json YAK_ID`
- Response: JSON object with yak details

### Write operations (main-only)

**create_yak**:
- Creates new yak with optional parent
- Executes: `yak.py create --title ... --type ... --priority ... --description ... [--parent ...]`
- Response: `{success, yak_id, title, type, priority, created}` or `{success: false, error}`

**update_yak**:
- Updates yak metadata (title/type/priority/description)
- Executes: `yak.py update YAK_ID [--title ...] [--type ...] [--priority ...] [--description ...]`
- Response: `{success, yak_id, updated}` or `{success: false, error}`

**shave_yak**:
- Starts working on a yak (hairy → shearing)
- Executes: `yak.py shave YAK_ID`
- Response: `{success, yak_id, status: "shearing"}` or `{success: false, error}`

**shorn_yak**:
- Marks yak as complete (shearing → shorn)
- Executes: `yak.py shorn YAK_ID`
- Response: `{success, yak_id, status: "shorn"}` or `{success: false, error}`

**regrow_yak**:
- Reopens completed yak (shorn → hairy)
- Executes: `yak.py regrow YAK_ID`
- Response: `{success, yak_id, status: "hairy"}` or `{success: false, error}`

**dep_yak**:
- Manages yak dependencies (add/remove)
- Executes: `yak.py dep add|remove YAK_ID DEP_ID`
- Response: `{success, yak_id, dep_id, action}` or `{success: false, error}`

## Helper functions

### execYak(args: string[]): string

Executes yak.py with proper escaping:

```typescript
const escapedArgs = args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ');
return execSync(`python3 "${YAK_SCRIPT_PATH}" ${escapedArgs}`, {
  encoding: 'utf-8',
});
```

**Why**: Consistent command execution with proper quote escaping.

### writeYakResponse(sourceGroup, responseType, data): void

Writes response file to `data/ipc/{sourceGroup}/responses/{responseType}_{timestamp}.json`:

```typescript
const responseFile = path.join(
  DATA_DIR,
  'ipc',
  sourceGroup,
  'responses',
  `${responseType}_${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(responseFile), { recursive: true });
fs.writeFileSync(responseFile, JSON.stringify(data, null, 2));
```

**Why**: Centralized response file writing with consistent paths.

## Authorization model

**Main-only operations** (check `if (!isMain)`):
- create_yak, update_yak, shave_yak, shorn_yak, regrow_yak, dep_yak

**All groups**:
- list_yaks, show_yak (read-only)

**Rationale**: Yaks are NanoClaw development tasks. Other groups (external users) shouldn't modify the backlog, but can view it for transparency.

## Error handling

All handlers use try/catch with:
- Logger error messages with context
- Response files with `{success: false, error}` for failures
- Graceful degradation (log error, write error response, continue)

## Invariants

1. **All operations** write response files
2. **All yak.py commands** use `execYak()` helper
3. **All responses** use `writeYakResponse()` helper
4. **Authorization checks** happen in individual handlers, not dispatcher
5. **Response file paths** use `data/ipc/{group}/responses/` pattern

## Why separate file?

**Before** (v1.0.0): 150+ lines of yak code inline in src/ipc.ts
**After** (v2.0.0): Dedicated 450-line yak-ipc.ts module

**Benefits**:
- ipc.ts stays focused on IPC routing
- Yak logic centralized and easier to test
- Easy to add new yak operations
- Clear separation of concerns

## Dependencies

```typescript
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DATA_DIR } from './config.js';
import { logger } from './logger.js';
```

**No dependencies on**:
- IpcDeps (doesn't need sendMessage, registerGroup, etc.)
- Container-runner
- Database

This makes yak-ipc.ts highly focused and testable.
