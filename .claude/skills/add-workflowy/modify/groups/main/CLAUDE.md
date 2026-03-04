// This file shows the modifications needed for add-workflowy skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION: Add WorkFlowy section to CLAUDE.md ==========
// Location: After the Fastmail section
// Insert this complete section:

---

## WorkFlowy

You have access to WorkFlowy via MCP tools. WorkFlowy is an outlining/note-taking tool for organizing ideas, tasks, and information in a hierarchical structure.

### Available WorkFlowy Tools

**mcp__workflowy__workflowy_list_targets**
- List all targets (shortcuts and built-in locations like "inbox" and "home")
- Parameters: None
- Returns: Array of targets with keys and names
- Use target keys as `parent_id` when creating nodes

**mcp__workflowy__workflowy_create_node**
- Create a new node in the outline
- Parameters:
  - `parent_id` (required): Target key (e.g., "inbox"), node ID, or "None" for top-level
  - `name` (required): Node text/content
  - `note` (optional): Note content (markdown supported)
  - `layoutMode` (optional): Display mode - "bullets", "todo", "h1", "h2", "h3", "code-block", "quote-block"
  - `position` (optional): "top" or "bottom" (where to insert among siblings)
- Returns: Created node with ID

**mcp__workflowy__workflowy_get_node**
- Get full details of a specific node
- Parameters: `id` (required, node ID)
- Returns: Node object with children array (recursive)

**mcp__workflowy__workflowy_list_children**
- List all child nodes of a parent
- Parameters: `parent_id` (optional): Target key, node ID, or "None" for top-level
- Returns: Array of child nodes

**mcp__workflowy__workflowy_update_node**
- Modify an existing node
- Parameters:
  - `id` (required): Node ID to update
  - `name` (optional): New node text
  - `note` (optional): New note content
  - `layoutMode` (optional): New layout mode
  - `completed` (optional): Mark as completed (boolean)
- At least one optional field must be provided
- Returns: Success/failure

**mcp__workflowy__workflowy_move_node**
- Move a node to a different parent or position
- Parameters:
  - `id` (required): Node ID to move
  - `parent_id` (required): New parent (target key, node ID, or "None")
  - `position` (optional): "top" or "bottom"
- Returns: Success/failure

**mcp__workflowy__workflowy_complete_node**
- Mark a node as completed (for todo layout mode)
- Parameters: `id` (required, node ID)
- Returns: Success/failure
- Use this for todo items to mark them done

**mcp__workflowy__workflowy_uncomplete_node**
- Mark a node as not completed
- Parameters: `id` (required, node ID)
- Returns: Success/failure
- Use this to reopen a completed todo

**mcp__workflowy__workflowy_delete_node**
- Permanently delete a node and all its children
- Parameters: `id` (required, node ID)
- Returns: Success/failure
- WARNING: Deletes entire subtree, no undo

**mcp__workflowy__workflowy_export_all**
- Export all nodes as a flat list
- Parameters: None
- Returns: Complete outline structure
- RATE LIMITED: 1 request per minute
- Use sparingly - prefer targeted queries with get_node or list_children

### Usage Examples

**List available locations**:
```
mcp__workflowy__workflowy_list_targets()
```

**Create a todo in inbox**:
```
mcp__workflowy__workflowy_create_node(
  parent_id="inbox",
  name="Call dentist",
  layoutMode="todo"
)
```

**Create a note with content**:
```
mcp__workflowy__workflowy_create_node(
  parent_id="inbox",
  name="Meeting notes - Project X",
  note="Discussed timeline and deliverables...",
  layoutMode="bullets"
)
```

**Get node details**:
```
mcp__workflowy__workflowy_get_node(id="<node-id>")
```

**List top-level nodes**:
```
mcp__workflowy__workflowy_list_children(parent_id="None")
```

**Complete a todo**:
```
mcp__workflowy__workflowy_complete_node(id="<node-id>")
```

**Move node to home**:
```
mcp__workflowy__workflowy_move_node(id="<node-id>", parent_id="home", position="top")
```

**Update node text**:
```
mcp__workflowy__workflowy_update_node(id="<node-id>", name="Updated text")
```

### When to Use WorkFlowy

- User asks to create a todo or task
- User wants to capture notes or ideas
- User asks about their task list or outline
- User wants to organize information hierarchically
- User mentions "inbox", "notes", or "outline"

### Best Practices

1. **Use targets for well-known locations** - Use "inbox" rather than node IDs
2. **Set layoutMode appropriately** - Use "todo" for tasks, "bullets" for notes
3. **Check parent exists** - List targets first or verify node IDs
4. **Respect rate limits** - Don't use export_all frequently
5. **Provide context** - Include notes for important items

### Target System

WorkFlowy uses **targets** as shortcuts to important locations:
- **inbox**: Quick capture location
- **home**: User's main workspace
- **bookmarks**: Saved important nodes
- Custom shortcuts created by user

Always use target keys when possible instead of node IDs.

