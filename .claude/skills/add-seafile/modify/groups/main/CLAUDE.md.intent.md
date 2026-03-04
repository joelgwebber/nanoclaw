# Intent: groups/main/CLAUDE.md additions

## What this section does

**Documents** the Seafile tools available to the agent and provides usage guidance.

## Why this file

`groups/main/CLAUDE.md` is the **agent's memory** for the main channel. It contains:
- Available tools and how to use them
- System context and constraints
- User preferences and patterns

When the agent runs, this entire file is included in the system prompt. It's how the agent knows what tools it has access to and how to use them properly.

## What we're adding

A complete **Seafile Cloud Storage** section that includes:

1. **Overview**: What Seafile is and hybrid access explanation
2. **Tool reference**: All 9 tools with parameters and descriptions
3. **Usage guidance**: When to use each tool (especially share links vs read)
4. **Examples**: Concrete code showing how to call each tool

## Key documentation decisions

### 1. Hybrid Access Explanation

```markdown
The Seafile MCP server uses a hybrid approach:
1. Local filesystem first: Checks `/workspace/seafile` for files
2. API fallback: Uses Seafile API if file not found locally
```

**Why explain this**: The agent doesn't need to know implementation details, but understanding hybrid access helps it set user expectations ("reading from local cache" vs "fetching from cloud").

**Why transparent**: The agent sees `[local]` or `[api]` in tool responses. Explaining why prevents confusion.

### 2. Share Link vs Read File Guidance

```markdown
**Use `seafile_create_share_link`** for:
- Images (png, jpg, gif, etc.)
- When the user asks to "see" or "show" a file
```

**Why critical**: Without this guidance, the agent might try to read binary files as text (fails) or forget that images need share links for viewing in WhatsApp.

**Real-world trigger**: User says "show me my insurance card" → agent knows to create share link, not read file.

### 3. Tool Parameter Documentation

```markdown
**mcp__seafile__seafile_list_dir**
- Parameters: `library_id` (required), `path` (optional, default: "/")
```

**Why explicit**: MCP tool schemas define parameters, but the agent needs to know:
- Which are required vs optional
- What defaults apply
- What format is expected (e.g., paths must start with "/")

### 4. Usage Examples

```markdown
mcp__seafile__seafile_create_share_link(library_id="abc123", path="/Personal/insurance_card.png")
```

**Why concrete**: Abstract descriptions like "create a share link" aren't enough. The agent needs to see actual tool invocation syntax with realistic library IDs and paths.

**Why varied**: Different examples (plain link, password-protected, with expiration) show the tool's flexibility.

## Formatting conventions

### Tool names

```markdown
**mcp__seafile__seafile_list_libraries**
```

**Bold** for visibility, full tool name including MCP prefix (`mcp__seafile__`).

**Why full name**: The agent must call tools using exact names. Abbreviating would require mental mapping.

### Code blocks

````markdown
```
mcp__seafile__seafile_list_libraries
```
````

**Backticks** for code, **not** fenced blocks with language markers.

**Why plain**: This is reference documentation, not executable code. Plain formatting is cleaner.

### Parameter format

```markdown
Parameters: `library_id`, `path`
```

**Inline code** for parameter names.

**Why**: Distinguishes parameter names from prose. Easy to scan.

## Where this section goes

**Location**: After the main header, before or alongside other integration docs.

**Why early**: Seafile was one of the first integrations. Putting it early reflects its foundational role.

**Ordering**: Alphabetically or chronologically (Seafile → Fastmail → WorkFlowy → Readeck → Substack).

## What the agent learns

After reading this section, the agent knows:

1. ✅ Seafile tools exist and are available
2. ✅ What each tool does (9 tools total)
3. ✅ How to call each tool (parameters and syntax)
4. ✅ When to use share links vs reading files
5. ✅ That hybrid access provides fast local reads
6. ✅ Concrete examples for common use cases

## What's NOT documented

**Internal implementation**: How the MCP server works, API endpoints, authentication flow. The agent doesn't need this.

**Troubleshooting**: That's for the skill documentation (SKILL.md), not the agent's memory.

**Setup steps**: Already done. The agent just needs to know how to USE the tools.

## Testing the documentation

After adding this section and restarting:

1. **Ask the agent**: "What Seafile tools do you have?"
   - Should list all 9 tools accurately

2. **Request an operation**: "Show me my insurance card from Seafile"
   - Should use `seafile_create_share_link` (not `seafile_read_file`)
   - Should provide a clickable link

3. **Check logs**: Agent should invoke tools correctly without retrying

## Maintenance

**When to update**:
- New Seafile tools added → document them
- Tool parameters change → update signatures
- Usage patterns emerge → add to examples
- Common mistakes → add to guidance

**Who updates**: Whoever modifies the MCP server should update this doc in the same commit.

## Relationship to SKILL.md

| SKILL.md | CLAUDE.md |
|----------|-----------|
| How to install integration | How to use installed tools |
| Troubleshooting | Usage examples |
| For humans (setting up) | For agent (using tools) |
| Implementation details | Interface documentation |

They're complementary: SKILL.md explains HOW to add Seafile, CLAUDE.md explains HOW to use Seafile.
