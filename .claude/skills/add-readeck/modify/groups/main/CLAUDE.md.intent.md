# Intent: groups/main/CLAUDE.md modifications

## What changed

**Added** Readeck tool documentation section to guide Sparky on using bookmark management features.

## Why this file

`groups/main/CLAUDE.md` is Sparky's (main channel agent) context and guidance document. It's read at the start of every conversation to provide:

- Available tools and their parameters
- Usage examples and best practices
- When to use specific integrations
- How to handle common user requests

Without this documentation, Sparky won't know:
- That Readeck tools exist
- What parameters they accept
- When to use bookmarks vs other tools
- Best practices for organizing saved content

## What to add

Insert the complete Readeck section **after the WorkFlowy section**. This keeps integrations organized (Seafile → Fastmail → WorkFlowy → Readeck).

### Section structure

1. **Introduction** - What Readeck is and how to access it
2. **Available Tools** - All 7 tools with parameters and descriptions
3. **Usage Examples** - Copy-pasteable examples for common operations
4. **When to Use** - Triggers that should invoke Readeck
5. **Best Practices** - Guidance on avoiding duplicates, organizing content

## Tool Documentation Pattern

Each tool follows this structure:

```markdown
**mcp__readeck__tool_name**
- Brief description
- Parameters:
  - `param1` (required/optional): Description
  - `param2` (required/optional): Description
- Returns: What it returns
```

**Why this format**:
- Clear parameter requirements (required/optional)
- Examples show exact syntax
- Returns section sets expectations

## Parameters vs Examples

**Parameters section**: Formal definition
- Shows all possible parameters
- Indicates required vs optional
- Describes what each does

**Examples section**: Practical usage
- Shows common use cases
- Demonstrates parameter combinations
- Easy to copy/adapt

Both are needed because agents learn from both formal specs and examples.

## When to Use Section

Critical for helping Sparky recognize bookmark-related requests:

```markdown
### When to Use Readeck

- User asks to "save this for later", "bookmark this", "add to reading list"
- User wants to search previously saved articles
- User wants to organize bookmarks with tags or collections
- User wants to archive old bookmarks
```

**Why**: User requests are often ambiguous. "Save this" could mean:
- Save to file (Write tool)
- Add to yaks (create_yak tool)
- Bookmark for later (add_bookmark tool)

The "When to Use" section helps Sparky route correctly.

## Best Practices Section

Guides Sparky on good bookmark management:

1. **Search before adding** - Avoid duplicate bookmarks
2. **Use descriptive tags** - Better organization and searchability
3. **Collections for grouping** - Higher-level organization
4. **Archive when done** - Keep active list manageable

**Why**: Without guidance, Sparky might:
- Create duplicate bookmarks
- Use inconsistent tagging (python vs Python vs PYTHON)
- Never archive, leading to unwieldy lists
- Not leverage collections effectively

## Location matters

**After WorkFlowy, before any unrelated sections**: Keeps related integrations grouped together. All external tool integrations should be documented in a cluster.

**Not at the very bottom**: Bottom of the file is often cut off in long context. Important integrations should be in the middle-to-upper section.

## Testing the documentation

After adding this section, test with:

```
User: "Save https://example.com/article for me to read later"
```

Sparky should use `mcp__readeck__add_bookmark` without being told explicitly.

## Common mistakes

**Tool name typos**: Must match exactly with what's registered in index.ts:
- Correct: `mcp__readeck__add_bookmark`
- Wrong: `mcp_readeck_add_bookmark` (single underscore)
- Wrong: `readeck__add_bookmark` (missing mcp prefix)

**Parameter name mismatches**: Parameter names in docs must match the MCP server's zod schema exactly.

**Missing examples**: Tools without examples are rarely used correctly on first try.

## Maintenance

When you add new Readeck tools to the MCP server, update this section:
1. Add tool to "Available Readeck Tools" list
2. Add example to "Usage Examples"
3. Consider if "When to Use" or "Best Practices" need updates

Keep docs and code in sync - use the git pre-commit hook to catch mismatches.
