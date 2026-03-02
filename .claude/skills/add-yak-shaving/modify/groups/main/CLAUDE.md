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

```
mcp__nanoclaw__list_yaks(status="hairy")
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

```
mcp__nanoclaw__create_yak(
  title="The proposed title",
  yak_type="bug",  # or "feature" or "task"
  priority=2,
  description="Full description including implementation notes",
  parent="nanoclaw-xxxx"  # Optional: parent yak ID for subtasks
)
```

The tool will return the yak ID upon success:
```
Yak created: nanoclaw-xxxx - "The proposed title"
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

### Available Yak Tools

**mcp__nanoclaw__list_yaks**
- List yaks filtered by status
- Parameters: `status` (optional: "hairy", "shearing", "shorn", "all", default: "hairy")
- Returns formatted list of yaks with ID, title, type, priority, and status

**mcp__nanoclaw__create_yak**
- Create a new yak (main group only)
- Parameters: `title`, `yak_type` (bug/feature/task), `priority` (1-3), `description`, `parent` (optional)
- Returns yak ID upon success
