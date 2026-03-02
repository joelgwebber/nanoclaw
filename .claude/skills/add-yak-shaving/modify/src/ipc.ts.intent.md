# Intent: src/ipc.ts modifications

## What changed

**Refactored** yak operations from inline implementation to dispatcher pattern.

**Before v2.0.0**:
- 150+ lines of inline yak code (create_yak, list_yaks handlers)
- Mixed concerns (IPC routing + yak business logic)

**After v2.0.0**:
- 8-line dispatcher that routes all yak operations to `handleYakIpc()`
- Clean separation: ipc.ts handles routing, yak-ipc.ts handles yak logic

## Modifications

### 1. Add import (line ~17)

Import the yak handler from the new dedicated module:

```typescript
import { handleYakIpc } from './yak-ipc.js';
```

### 2. Expand interface (lines ~155-186)

Add yak-related fields to `processTaskIpc` data parameter:

- **Base fields**: `title`, `yak_type`, `priority`, `description`, `parent`
- **Query fields**: `status`, `yak_id`
- **Update fields**: `new_title`, `new_type`, `new_priority`, `new_description`
- **Dependency fields**: `dep_action`, `dep_id`

### 3. Replace case statements (lines ~392-538)

Replace ALL inline yak handlers with dispatcher:

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

This replaces:
- `create_yak` handler (~98 lines)
- `list_yaks` handler (~40 lines)
- Total: 138 lines removed, 9 lines added

## Why this refactoring?

### Benefits

1. **Cleaner separation of concerns**
   - ipc.ts: Routes IPC messages to appropriate handlers
   - yak-ipc.ts: Handles yak business logic

2. **Easier to maintain**
   - Adding new yak operations doesn't bloat ipc.ts
   - Yak logic centralized in one file

3. **Easier to test**
   - Can test yak operations independently of IPC layer
   - Mock dependencies in isolation

4. **Better code organization**
   - ipc.ts stays focused on IPC routing
   - yak-ipc.ts handles yak-specific concerns

### Trade-offs

- **Added complexity**: One more file to navigate
- **Indirection**: Jump from ipc.ts to yak-ipc.ts to understand flow

**Verdict**: Worth it! As we add more yak operations (8 total now), the benefits of separation outweigh the indirection cost.

## Invariants

1. **All yak operations** must be listed in the dispatcher case statement
2. **Interface contract**: Data parameter must include all fields needed by yak-ipc.ts
3. **Authorization**: Still enforced by yak-ipc.ts handlers (not ipc.ts)
4. **Response files**: Still written by yak-ipc.ts to `data/ipc/{group}/responses/`

## Migration path

If implementing this skill on an existing installation with inline yak handlers:

1. Create `src/yak-ipc.ts` with all handlers
2. Add import to `src/ipc.ts`
3. Replace inline yak cases with dispatcher
4. Remove old inline handler code
5. Build and test

The dispatcher pattern makes it easy to add more operations later without touching ipc.ts.
