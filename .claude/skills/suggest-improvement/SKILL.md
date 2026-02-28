---
name: suggest-improvement
description: Help Sparky suggest improvements to NanoClaw itself by creating Yaks tasks. Prevents runaway self-modification by requiring user approval before creating tasks.
---

# Suggest Improvement

This skill allows Sparky to identify and propose improvements to NanoClaw without making direct changes. Instead, it creates Yaks tasks that the user can review and implement at leisure.

## When to Use This Skill

### Automatic Triggers (Sparky should proactively suggest)

Invoke this skill when you encounter:

1. **Limitations in current implementation**
   - Features you can't implement due to missing capabilities
   - APIs that don't exist but would be useful
   - Configuration that's hard-coded but should be dynamic

2. **Technical debt**
   - Repeated code that should be abstracted
   - Inconsistent patterns across the codebase
   - Missing error handling or validation

3. **Performance issues**
   - Slow operations that could be optimized
   - Unnecessary API calls or file reads
   - Missing caching opportunities

4. **Better approaches discovered**
   - More elegant solutions to existing problems
   - Libraries or tools that would simplify implementation
   - Architectural improvements

5. **Integration opportunities**
   - New channels or tools that could be added
   - Existing integrations that could be enhanced
   - Better ways to connect existing components

### Manual Triggers (User explicitly requests)

The user may also explicitly ask:
- "What improvements would you suggest?"
- "Can you suggest some yaks for yourself?"
- "What would make your job easier?"

## How to Use This Skill

### Step 1: Identify the Improvement

When you encounter a situation worthy of suggesting, analyze:
- **What** is the current limitation or issue?
- **Why** would fixing it be valuable?
- **How** might it be implemented? (high-level only)
- **What** priority should it have? (p1=critical, p2=important, p3=nice-to-have)

### Step 2: Propose to User

Use the AskUserQuestion tool to propose the yak:

```
I've identified a potential improvement to NanoClaw:

**Title**: [Concise title]

**Description**:
[Clear explanation of what this would improve and why it's valuable]

**Type**: [bug/feature/task]

**Priority**: [p1/p2/p3]

**Implementation notes**:
[High-level approach, if obvious]

Should I create a yak to track this?
```

Present as a yes/no question with:
- "Yes, create the yak" option
- "No, skip this" option

### Step 3: Create the Yak (if approved)

If user approves, send an IPC message to the NanoClaw controller:

```bash
cat > /workspace/ipc/tasks/create_yak_$(date +%s).json <<'EOF'
{
  "type": "create_yak",
  "title": "The proposed title",
  "yak_type": "bug|feature|task",
  "priority": 1,
  "description": "The full description including implementation notes"
}
EOF
```

**Important**:
- Priority must be a number (1, 2, or 3), not "p1", "p2", "p3"
- 1 = highest priority, 3 = lowest
- The controller will pick up the IPC message and create the yak on the host
- Optional: Add `"parent": "nanoclaw-xxxx"` to create a child yak

### Step 4: Confirm Creation

After creating, tell the user:
```
Yak created! (nanoclaw-XXXX) You can view it with the yaks tools or I can show it to you.
```

## Examples

### Example 1: Missing Feature

**Trigger**: User asks Sparky to send a WhatsApp image, but current code only supports text.

**Proposal**:
```
I've identified a potential improvement to NanoClaw:

**Title**: Add WhatsApp image sending support

**Description**:
Currently NanoClaw can only send text messages to WhatsApp. Adding image support would allow:
- Sharing diagrams or screenshots
- Sending generated charts/graphs
- Forwarding images from Seafile or other sources

**Type**: feature

**Priority**: p2

**Implementation notes**:
- Modify src/channels/whatsapp.ts to support Buffer/base64 images
- Add sendImage() method wrapping whatsapp-web.js MessageMedia
- Update router to handle image attachments

Should I create a yak to track this?
```

**If approved**: Send IPC message:
```bash
cat > /workspace/ipc/tasks/create_yak_$(date +%s).json <<'EOF'
{
  "type": "create_yak",
  "title": "Add WhatsApp image sending support",
  "yak_type": "feature",
  "priority": 2,
  "description": "Currently NanoClaw can only send text messages to WhatsApp. Adding image support would allow sharing diagrams, screenshots, and forwarding images from Seafile. Implementation: Modify src/channels/whatsapp.ts to support Buffer/base64, add sendImage() method, update router."
}
EOF
```

### Example 2: Technical Debt

**Trigger**: While working on container-runner.ts, notice repeated environment variable reading pattern.

**Proposal**:
```
I've identified a potential improvement to NanoClaw:

**Title**: Extract environment variable reading into helper function

**Description**:
The pattern of reading environment variables with defaults is repeated in 5+ places across src/container-runner.ts and src/config.ts. This creates:
- Inconsistent error handling
- Harder to test
- Difficult to add validation

Creating a readEnv() helper would centralize this logic.

**Type**: task

**Priority**: p3

**Implementation notes**:
- Create src/env-helper.ts
- Add readEnv(key, defaultValue, validator?) function
- Replace existing patterns
- Add tests

Should I create a yak to track this?
```

### Example 3: Performance Issue

**Trigger**: Notice that every message triggers a full file read of CLAUDE.md even when unchanged.

**Proposal**:
```
I've identified a potential improvement to NanoClaw:

**Title**: Cache CLAUDE.md contents with mtime checking

**Description**:
Every incoming message triggers fs.readFileSync() for groups/{name}/CLAUDE.md, even when the file hasn't changed. With frequent messages, this adds unnecessary I/O overhead.

Caching with mtime checking would reduce disk reads by ~90% in normal usage.

**Type**: task

**Priority**: p2

**Implementation notes**:
- Add cache: Map<string, {content: string, mtime: number}>
- Check fs.statSync(path).mtimeMs before reading
- Only read if mtime changed or cache miss

Should I create a yak to track this?
```

## Constraints and Guidelines

### DO suggest improvements when:
- You genuinely hit a limitation while trying to help the user
- You notice clear technical debt during code work
- You identify a performance issue through observation
- You discover a better approach while implementing something

### DON'T suggest improvements when:
- It's purely cosmetic or stylistic preference
- The improvement is speculative without concrete benefit
- You're just brainstorming without specific context
- The change would be disruptive without clear value

### Rate Limiting
- **Maximum 1 suggestion per conversation** unless user explicitly asks for more
- Don't suggest the same thing twice if already declined
- Prioritize high-value improvements over minor tweaks

### Priority Guidelines
- **p1**: Blocking issues, critical bugs, security problems
- **p2**: Valuable features, important optimizations, significant debt
- **p3**: Nice-to-haves, minor improvements, low-risk enhancements

## Implementation

This section documents how to implement the `create_yak` IPC handler so the feature can be reconstituted if needed.

### Prerequisites

- Yaks plugin installed: `~/.claude/plugins/cache/yaks-marketplace/yaks/0.1.1/`
- Yaks initialized in the NanoClaw project (`/yaks:init` or `.yaks/` directory exists)

### Server-Side Implementation

**File: `src/ipc.ts`**

Add the `create_yak` case to the `processTaskIpc` function switch statement:

```typescript
case 'create_yak':
  // Only main group can create yaks
  if (!isMain) {
    logger.warn(
      { sourceGroup },
      'Unauthorized create_yak attempt blocked',
    );
    break;
  }
  if (data.title && data.yak_type && data.priority && data.description) {
    try {
      const { execSync } = await import('child_process');
      const args = [
        'create',
        '--title',
        data.title,
        '--type',
        data.yak_type,
        '--priority',
        data.priority.toString(),
        '--description',
        data.description,
      ];
      if (data.parent) {
        args.push('--parent', data.parent);
      }

      const yakScript = path.join(
        process.env.HOME || '',
        '.claude/plugins/cache/yaks-marketplace/yaks/0.1.1/scripts/yak.py',
      );

      const result = execSync(
        `python3 "${yakScript}" ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`,
        { encoding: 'utf-8' },
      );

      logger.info(
        { sourceGroup, title: data.title, result: result.trim() },
        'Yak created via IPC',
      );
    } catch (err) {
      logger.error(
        { err, sourceGroup, title: data.title },
        'Error creating yak via IPC',
      );
    }
  } else {
    logger.warn(
      { data },
      'Invalid create_yak request - missing required fields (title, yak_type, priority, description)',
    );
  }
  break;
```

**Add to the processTaskIpc data interface** (around line 156):

```typescript
export async function processTaskIpc(
  data: {
    // ... existing fields ...
    // For create_yak
    title?: string;
    yak_type?: string;
    priority?: number;
    description?: string;
    parent?: string;
  },
  sourceGroup: string,
  isMain: boolean,
  deps: IpcDeps,
): Promise<void> {
```

### Deployment

1. **Build the TypeScript code**:
   ```bash
   npm run build
   ```

2. **Restart the service**:
   ```bash
   # macOS
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw

   # Linux
   systemctl --user restart nanoclaw
   ```

3. **Verify IPC watcher started**:
   ```bash
   tail logs/nanoclaw.log | grep "IPC watcher started"
   ```

### Testing

Create a test IPC message:

```bash
cat > data/ipc/main/tasks/create_yak_$(date +%s).json <<'EOF'
{
  "type": "create_yak",
  "title": "Test yak creation",
  "yak_type": "task",
  "priority": 3,
  "description": "Testing the IPC flow"
}
EOF
```

Check logs within 1 second (IPC poll interval):

```bash
tail -f logs/nanoclaw.log | grep "Yak created"
```

Should see: `Yak created via IPC: nanoclaw-XXXX`

Verify yak was created:

```bash
/yaks:show nanoclaw-XXXX
```

### How It Works

1. **Agent creates IPC file**: Writes JSON to `/workspace/ipc/tasks/create_yak_*.json` (mounted from `data/ipc/main/tasks/`)
2. **Controller polls IPC directory**: Every 1 second (IPC_POLL_INTERVAL)
3. **Controller processes message**: Reads JSON, validates fields, runs yaks.py on host
4. **Yak created**: Controller executes python3 command with proper escaping
5. **IPC file deleted**: Message consumed, file removed
6. **Logged**: Success logged with yak ID or error logged if failed

### Authorization

- **Only main group** can create yaks (same pattern as `register_group`)
- Non-main groups receive: "Unauthorized create_yak attempt blocked"
- This prevents other groups from spamming the yak backlog

## Integration with CLAUDE.md

Add this to `groups/main/CLAUDE.md` so Sparky knows about this capability:

```markdown
## Suggesting Improvements

When you encounter limitations, technical debt, or better approaches while helping the user, you can propose creating a yak (task) to track potential NanoClaw improvements.

**How to suggest**:
1. Identify the improvement (what, why, how)
2. Ask user for approval to create a yak
3. If approved, send an IPC message:
   ```bash
   cat > /workspace/ipc/tasks/create_yak_$(date +%s).json <<'EOF'
   {
     "type": "create_yak",
     "title": "Brief title",
     "yak_type": "bug|feature|task",
     "priority": 1,
     "description": "Full description with implementation notes"
   }
   EOF
   ```
4. Tell the user the yak has been queued for creation

**Important constraints**:
- Always ask for approval before creating yaks
- Maximum 1 suggestion per conversation unless user explicitly asks for more
- Only suggest when genuinely valuable, not for minor cosmetic changes
- Priority: 1=critical, 2=important, 3=nice-to-have

**Triggers for suggestions**:
- You hit a limitation that prevents completing a task
- You notice repeated technical debt while working
- You identify clear performance issues
- You discover a better implementation approach

If the user asks "what would you suggest?" or "any improvements?", propose 2-3 high-value improvements with full context.
```

## Troubleshooting

### "Sparky suggests too many improvements"
- Check that guidance includes rate limiting (max 1 per conversation)
- Verify approval step is required
- Review priority guidelines - only p1/p2 should be proactive

### "Sparky doesn't suggest anything"
- Verify guidance is in groups/main/CLAUDE.md
- Check that skill is in .claude/skills/suggest-improvement/
- Ensure triggers section is clear enough

### "Suggestions are too vague"
- Emphasize implementation notes in the proposal
- Require analysis of what/why/how before proposing
- Review examples for specificity

### "Yak not created after IPC message"
- Check IPC watcher is running: `tail logs/nanoclaw.log | grep "IPC watcher started"`
- Verify IPC file was consumed: `ls data/ipc/main/tasks/` (should be empty)
- Check logs for errors: `tail logs/nanoclaw.log | grep -i "yak\|error"`
- Verify yaks plugin installed: `ls ~/.claude/plugins/cache/yaks-marketplace/yaks/*/scripts/yak.py`
- Check IPC message format (must have title, yak_type, priority, description)

### "IPC permission denied or command not found"
- Verify `python3` is in PATH: `which python3`
- Check yaks.py script exists at expected path
- Ensure HOME environment variable is set for the service
- Review error logs: `tail logs/nanoclaw.log | grep -A 5 "Error creating yak"`

## Removal

To remove this capability:

1. Remove `.claude/skills/suggest-improvement/SKILL.md`
2. Remove "Suggesting Improvements" section from `groups/main/CLAUDE.md`
3. Remove `create_yak` case from `src/ipc.ts` in the `processTaskIpc` switch statement
4. Remove create_yak fields from the `processTaskIpc` data interface
5. Rebuild and restart:
   ```bash
   npm run build
   systemctl --user restart nanoclaw  # or launchctl kickstart for macOS
   ```
6. Optionally keep yaks created through this skill - they're just regular tasks

## References

- [Yaks Task Tracking](https://github.com/anthropics/yaks-marketplace)
- Main CLAUDE.md section on "Maintaining Add-* Skills"
