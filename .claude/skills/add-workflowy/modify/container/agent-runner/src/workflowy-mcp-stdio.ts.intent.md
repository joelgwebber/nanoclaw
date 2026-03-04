# Intent: container/agent-runner/src/workflowy-mcp-stdio.ts (NEW FILE)

## What this file is

**NEW** MCP server providing WorkFlowy outliner integration via REST API.

## What it exports

Main server process that exposes 7 MCP tools for outline management:

- `workflowy_list_targets` - List shortcuts and built-in locations (inbox, home)
- `workflowy_get_node` - Get node details with children
- `workflowy_search` - Search nodes by text
- `workflowy_create_node` - Create new node
- `workflowy_update_node` - Modify node name/note/completion
- `workflowy_move_node` - Relocate node to different parent
- `workflowy_delete_node` - Remove node permanently

## Architecture

### API Communication

- Base URL: `https://workflowy.com/api/v1`
- Authentication via `WORKFLOWY_API_KEY` Bearer token
- Single request helper: `apiRequest(endpoint, method, body)`
- Methods supported: GET, POST, DELETE

### Data Model

```typescript
interface WorkFlowyNode {
  id: string;              // Unique node identifier
  name: string;            // Node text/title
  note?: string;           // Note content (markdown)
  layoutMode?: string;     // Display mode
  completed?: boolean;     // Todo completion status
  parent?: string;         // Parent node ID
  children?: WorkFlowyNode[]; // Nested children (recursive)
}

interface WorkFlowyTarget {
  key: string;             // Target key for API (e.g., "inbox", "home")
  name: string;            // Display name
  node_id?: string;        // Resolved node ID
}
```

### Target System

WorkFlowy uses **targets** as shortcuts to important locations:

- **Built-in targets**: `inbox`, `home`, `bookmarks`
- **Custom shortcuts**: User-defined shortcuts with custom keys
- **Usage**: Use target keys as `parent_id` when creating nodes

**Why targets matter**: Users don't remember node IDs. Targets provide stable, memorable references like "create in my inbox" → `parent_id: "inbox"`.

## Tool Details

### workflowy_list_targets
**Purpose**: Discover available locations for node creation
**Parameters**: None
**Returns**: Array of targets with keys and names

**Use case**: Agent calls this first to understand where nodes can be created.

### workflowy_get_node
**Purpose**: Fetch node details with full tree of children
**Parameters**:
- `node_id` (required): Node ID or target key

**Returns**: Node object with recursive children array

**Recursion**: Children are fully expanded, not just IDs. This allows deep tree traversal in one call.

### workflowy_search
**Purpose**: Find nodes by text content
**Parameters**:
- `query` (required): Search string
- `parent_id` (optional): Limit search to subtree

**Returns**: Array of matching nodes with parent context

**Search scope**: Searches both node names and notes.

### workflowy_create_node
**Purpose**: Create new node in outline
**Parameters**:
- `name` (required): Node text
- `parent_id` (required): Parent node ID or target key (e.g., "inbox")
- `note` (optional): Note content

**Returns**: Created node with ID

**Parent resolution**: Accepts both node IDs and target keys, making it easy to create in standard locations.

### workflowy_update_node
**Purpose**: Modify existing node
**Parameters**:
- `node_id` (required): Node to update
- `name` (optional): New text
- `note` (optional): New note content
- `completed` (optional): Toggle completion status

**At least one optional field required**

**Returns**: Success/failure

**Partial updates**: Only provided fields are updated. Others remain unchanged.

### workflowy_move_node
**Purpose**: Relocate node to different parent
**Parameters**:
- `node_id` (required): Node to move
- `parent_id` (required): New parent (node ID or target key)

**Returns**: Success/failure

**Use case**: Reorganizing outlines, moving tasks between projects

### workflowy_delete_node
**Purpose**: Permanently remove node and all children
**Parameters**:
- `node_id` (required): Node to delete

**Returns**: Success/failure

**WARNING**: Deletes entire subtree. No undo.

## Error Handling

All tools wrap API calls in try/catch:

```typescript
try {
  const result = await apiRequest(...);
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
} catch (err) {
  return {
    content: [{ type: 'text', text: `Error: ${err.message}` }],
    isError: true
  };
}
```

## Environment Variables

Required:
- `WORKFLOWY_API_KEY` - API token from WorkFlowy account settings

Validation:
- Exits with error if missing
- No URL configuration needed (API base URL is constant)

## Integration Pattern

Follows standard NanoClaw MCP server pattern:

1. Import MCP SDK components
2. Define API helpers and types
3. Create server instance
4. Register tools with zod schemas
5. Start stdio transport

## Why WorkFlowy?

- Powerful outliner for hierarchical notes and tasks
- Infinite nesting depth
- Fast search across all nodes
- API allows programmatic outline management
- Shortcuts provide stable reference points

## Trade-offs

**Recursive children**: `get_node` returns full subtree, not just immediate children. This can be verbose for large branches but eliminates the need for multiple API calls to traverse the tree.

**No bulk operations**: API doesn't support batch creates/updates. Multiple nodes require multiple calls.

**Target key stability**: Target keys are stable (user-defined), but node IDs change if nodes are moved. Always prefer target keys for well-known locations.

## Use Cases

- Create todo items in inbox
- Search meeting notes
- Organize project hierarchies
- Quick capture to specific locations
- Move tasks between projects
