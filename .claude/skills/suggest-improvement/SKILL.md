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

If user approves, invoke `/yaks:create` with:
- `--title "The proposed title"`
- `--type [bug/feature/task]`
- `--priority [p1/p2/p3]`
- `--description "The full description including implementation notes"`

### Step 4: Confirm Creation

After creating, tell the user:
```
Yak created! You can view it with /yaks:show [ID] or work on it later with /yaks:shave [ID].
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

**If approved**: Run `/yaks:create --title "Add WhatsApp image sending support" --type feature --priority p2 --description "Currently NanoClaw can only send text messages..."`

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

## Integration with CLAUDE.md

Add this to `groups/main/CLAUDE.md` so Sparky knows about this capability:

```markdown
## Suggesting Improvements

You can suggest improvements to NanoClaw itself using the `/suggest-improvement` skill. When you encounter limitations, technical debt, or better approaches while helping the user, you may proactively propose creating a yak to track the improvement.

**Important constraints**:
- Always ask for approval before creating yaks
- Maximum 1 suggestion per conversation unless user explicitly asks for more
- Only suggest when genuinely valuable, not for minor cosmetic changes
- See `/suggest-improvement` skill for full guidelines

If the user asks "what would you suggest?" or "any improvements?", use this skill to propose 2-3 high-value yaks.
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

## Removal

To remove this capability:

1. Remove `.claude/skills/suggest-improvement/SKILL.md`
2. Remove "Suggesting Improvements" section from `groups/main/CLAUDE.md`
3. Optionally keep yaks created through this skill - they're just regular tasks

## References

- [Yaks Task Tracking](https://github.com/anthropics/yaks-marketplace)
- Main CLAUDE.md section on "Maintaining Add-* Skills"
