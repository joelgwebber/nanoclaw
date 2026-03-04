# Intent: groups/main/CLAUDE.md modifications

## What changed

**Added** WorkFlowy tool documentation section to guide Sparky on using outline management features.

## Why this file

See add-readeck/modify/groups/main/CLAUDE.md.intent.md for detailed explanation of why agent guidance documentation is critical.

### WorkFlowy-specific notes

**10 tools**: WorkFlowy has the most tools of any integration:
- 2 discovery tools (list_targets, list_children)
- 1 read tool (get_node)
- 3 write tools (create_node, update_node, delete_node)
- 2 move tools (move_node, complete/uncomplete)
- 1 bulk export tool (export_all - rate limited)
- 1 search tool (workflowy_search)

**Target system**: Unique to WorkFlowy. Agents must understand:
- Use target keys ("inbox", "home") instead of node IDs when possible
- List targets first to discover available locations
- Target keys are stable, node IDs can change

**Layout modes**: WorkFlowy supports different node types:
- "todo" - checkbox items
- "bullets" - standard outline
- "h1", "h2", "h3" - headings
- "code-block", "quote-block" - formatted content

Agents should choose appropriate modes based on content type.

**Rate limiting**: export_all is limited to 1 req/min. Guide agents to use targeted queries (get_node, list_children) instead of bulk export.

**Hierarchical nature**: WorkFlowy is deeply nested. Agents need to understand:
- Parent/child relationships
- Moving nodes between parents
- Recursive children in get_node responses

## When to Use section

Critical triggers:
- "create a todo" → use create_node with layoutMode="todo"
- "add to my inbox" → use parent_id="inbox"
- "what's on my task list" → use list_children or get_node
- "organize my notes" → use move_node to reorganize

## Testing

```
User: "Add 'buy groceries' to my inbox"
```

Agent should:
1. Use create_node with parent_id="inbox", name="buy groceries", layoutMode="todo"
2. Not need to list_targets first (inbox is a known built-in)
3. Report the created node ID for reference
