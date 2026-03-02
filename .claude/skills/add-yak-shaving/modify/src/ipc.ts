// This file shows the modifications needed for add-yak-shaving skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION 1: Add import for yak handler ==========
// Location: Top of file with other imports (around line 17)

import { handleYakIpc } from './yak-ipc.js';

// ========== MODIFICATION 2: Update processTaskIpc interface ==========
// Location: Around line 155-186
// Add these yak-related fields to the data parameter:

export async function processTaskIpc(
  data: {
    type: string;
    // ... existing fields ...

    // For yak operations (delegated to yak-ipc.ts)
    title?: string;
    yak_type?: string;
    priority?: number;
    description?: string;
    parent?: string;
    status?: string; // 'hairy' | 'shearing' | 'shorn' | 'all'
    yak_id?: string;
    new_title?: string;
    new_type?: string;
    new_priority?: number;
    new_description?: string;
    dep_action?: 'add' | 'remove';
    dep_id?: string;
  },
  sourceGroup: string,
  isMain: boolean,
  deps: IpcDeps,
): Promise<void> {
  // ... existing code ...
}

// ========== MODIFICATION 3: Replace yak case statements with dispatcher ==========
// Location: Around line 392-538 (where create_yak and list_yaks cases were)
// Replace ALL yak-related case statements with this dispatcher:

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

// ========== BENEFITS OF THIS REFACTORING ==========
//
// Before: 150+ lines of inline yak code in ipc.ts
// After: 8-line dispatcher + dedicated yak-ipc.ts module
//
// - Cleaner separation of concerns
// - Easier to test yak operations independently
// - Easier to add new yak operations without bloating ipc.ts
// - All yak logic in one place (src/yak-ipc.ts)
