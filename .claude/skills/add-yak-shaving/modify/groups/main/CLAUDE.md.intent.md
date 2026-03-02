# Intent: groups/main/CLAUDE.md modifications

## What changed

Added comprehensive "Suggesting Improvements" section that guides Sparky on when and how to create yaks via IPC.

## Where to add

Insert this section after the existing content in `groups/main/CLAUDE.md`, typically before the "Scheduling for Other Groups" section if it exists, or at the end of the file.

## Key sections

### When to Suggest

- **Automatic triggers**: Detailed list of when to proactively suggest (limitations, debt, performance, better approaches)
- **User requests**: Explicit questions that trigger suggestion mode

### How to Suggest (4-step workflow)

**Step 0: Check for duplicates**
- Uses list_yaks IPC to check hairy yaks
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
- IPC message format with create_yak
- Important notes about priority format (numeric, not p1/p2/p3)
- Optional parent yak reference

**Step 4: Confirm**
- Checks response file for yak ID
- Shows success/error handling
- Tells user the yak ID

### Constraints

- DO/DON'T guidelines (prevents spam, keeps quality high)
- Rate limiting (max 1 per conversation)
- Priority guidelines (p1/p2/p3 definitions)

## Invariants

- Does NOT modify any existing sections
- Does NOT change scheduling, WorkFlowy, Readeck, or other tool documentation
- Preserves all existing formatting and structure

## Must-keep

- The markdown formatting and code block syntax
- The 4-step workflow structure (agents follow this pattern)
- The "Important constraints" section (prevents suggestion spam)
- The response file JSON example (shows expected format)

## Why this section?

- Enables agent self-improvement without runaway changes
- Approval-gated: user must explicitly approve each yak
- Introspection: agent can check existing yaks to avoid duplicates
- Feedback loop: agent gets confirmation with yak ID
- Rate limited: max 1 suggestion per conversation prevents spam
