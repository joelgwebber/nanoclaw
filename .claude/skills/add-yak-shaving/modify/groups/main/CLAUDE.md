## Suggesting Improvements

When you encounter limitations, technical debt, or better approaches while helping the user, you can propose creating a yak (task) to track potential NanoClaw improvements.

### When to Suggest

**Automatically propose** when you encounter:
- Limitations that prevent completing a task
- Repeated technical debt during code work
- Clear performance issues
- Better implementation approaches

**On user request**:
- "What improvements would you suggest?"
- "Can you suggest some yaks for yourself?"
- "What would make your job easier?"

### How to Suggest

**Step 0: Check for duplicates**

Before proposing, check if a similar yak already exists:

```bash
cat > /workspace/ipc/tasks/list_yaks_$(date +%s).json <<'EOF'
{
  "type": "list_yaks",
  "status": "hairy"
}
EOF

# Wait ~1 second for response
sleep 1
cat /workspace/ipc/responses/list_yaks_*.json | tail -1
```

Status values: `hairy` (not started), `shearing` (in progress), `shorn` (completed), `all`

If a similar yak exists, reference it instead of creating a duplicate.

**Step 1: Analyze the improvement**
- **What** is the limitation or issue?
- **Why** would fixing it be valuable?
- **How** might it be implemented? (high-level only)
- **What** priority? (1=critical, 2=important, 3=nice-to-have)

**Step 2: Propose to user**

Use the AskUserQuestion tool:

```
I've identified a potential improvement to NanoClaw:

**Title**: [Concise title]

**Description**: [Clear explanation of what this would improve and why it's valuable]

**Type**: [bug/feature/task]

**Priority**: [1/2/3]

**Implementation notes**: [High-level approach, if obvious]

Should I create a yak to track this?
```

**Step 3: Create the yak (if approved)**

```bash
cat > /workspace/ipc/tasks/create_yak_$(date +%s).json <<'EOF'
{
  "type": "create_yak",
  "title": "The proposed title",
  "yak_type": "bug|feature|task",
  "priority": 1,
  "description": "Full description including implementation notes"
}
EOF
```

**Important**:
- Priority must be a number (1, 2, or 3), not "p1", "p2", "p3"
- Optional: Add `"parent": "nanoclaw-xxxx"` to create a child yak

**Step 4: Confirm creation**

Wait ~1 second and check the response:

```bash
sleep 1
cat /workspace/ipc/responses/yak_*.json | tail -1
```

Success response:
```json
{
  "success": true,
  "yak_id": "nanoclaw-xxxx",
  "title": "...",
  "type": "feature",
  "priority": 2,
  "created": "2026-03-01T12:34:56.789Z"
}
```

Tell the user:
```
Yak created! (nanoclaw-XXXX) You can view it with the yaks tools or I can show it to you.
```

### Constraints

**DO suggest when**:
- You genuinely hit a limitation while trying to help
- You notice clear technical debt during code work
- You identify a performance issue through observation
- You discover a better approach while implementing

**DON'T suggest when**:
- It's purely cosmetic or stylistic preference
- The improvement is speculative without concrete benefit
- You're just brainstorming without specific context
- The change would be disruptive without clear value

**Rate limiting**:
- Maximum 1 suggestion per conversation unless user explicitly asks for more
- Don't suggest the same thing twice if already declined
- Prioritize high-value improvements over minor tweaks

**Priority guidelines**:
- **p1**: Blocking issues, critical bugs, security problems
- **p2**: Valuable features, important optimizations, significant debt
- **p3**: Nice-to-haves, minor improvements, low-risk enhancements
