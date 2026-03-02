# Intent: groups/main/CLAUDE.md modifications

## What changed

Added comprehensive "Suggesting Improvements" section that guides Sparky on when and how to create yaks via MCP tools.

## Where to add

Insert this section after the existing content in `groups/main/CLAUDE.md`, typically before the "Scheduling for Other Groups" section if it exists, or at the end of the file.

## Key sections

### When to Suggest

- **Automatic triggers**: Detailed list of when to proactively suggest (limitations, debt, performance, better approaches)
- **User requests**: Explicit questions that trigger suggestion mode

### How to Suggest (4-step workflow)

**Step 0: Check for duplicates**
- Uses `mcp__nanoclaw__list_yaks(status="hairy")` MCP tool
- Prevents duplicate suggestions
- Shows status values explanation

**Step 1: Analyze**
- What, Why, How, Priority framework
- Ensures thoughtful proposals

**Step 2: Propose**
- Uses AskUserQuestion tool
- Structured format for consistency
- Gets explicit approval before creating

**Step 3: Create**
- Uses `mcp__nanoclaw__create_yak(...)` MCP tool
- Important notes about priority format (numeric 1/2/3)
- Optional parent yak reference

**Step 4 removed**: No manual confirmation needed
- MCP tool returns yak ID immediately
- Success/failure is synchronous

### Available Yak Tools

Documents the two MCP tools:
- `mcp__nanoclaw__list_yaks(status="hairy|shearing|shorn|all")`
- `mcp__nanoclaw__create_yak(title, yak_type, priority, description, parent?)`

### Constraints

- DO/DON'T guidelines (prevents spam, keeps quality high)
- Rate limiting (max 1 per conversation)
- Priority guidelines (p1/p2/p3 definitions)

## Differences from bash IPC approach

**Old (bash IPC)**:
```bash
cat > /workspace/ipc/tasks/create_yak_$(date +%s).json <<'EOF'
{"type": "create_yak", ...}
EOF

sleep 1
cat /workspace/ipc/responses/yak_*.json | tail -1
```

**New (MCP tools)**:
```
mcp__nanoclaw__create_yak(title="...", yak_type="...", priority=2, description="...")
# Returns: Yak created: nanoclaw-xxxx - "..."
```

**Benefits**:
- Cleaner syntax (function call vs bash heredoc)
- Type-safe parameters (zod validation)
- Immediate response (polling hidden by MCP layer)
- Consistent with other NanoClaw features

## Invariants

- Does NOT modify any existing sections
- Does NOT change scheduling, WorkFlowy, Readeck, or other tool documentation
- Preserves all existing formatting and structure

## Must-keep

- The markdown formatting and code block syntax
- The 4-step workflow structure (agents follow this pattern)
- The "Important constraints" section (prevents suggestion spam)
- The priority guidelines (p1/p2/p3 definitions)

## Why MCP tools instead of bash IPC?

**User experience**: From Sparky's perspective, yak tools look the same as all other NanoClaw features:
- `mcp__nanoclaw__create_yak(...)` - consistent with `mcp__nanoclaw__schedule_task(...)`
- `mcp__nanoclaw__list_yaks(...)` - consistent with `mcp__nanoclaw__list_tasks()`

**Simpler workflow**: Agent just calls a function and gets a response, no manual IPC file handling

## Why this section?

- Enables agent self-improvement without runaway changes
- Approval-gated: user must explicitly approve each yak
- Introspection: agent can check existing yaks to avoid duplicates
- Feedback loop: agent gets confirmation with yak ID (synchronous via MCP)
- Rate limited: max 1 suggestion per conversation prevents spam
