// This file shows the modifications needed for add-workflowy skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION 1: Add workflowy MCP server path ==========
// Location: Around line 550, after other MCP path declarations

const workflowyMcpPath = path.join(__dirname, 'workflowy-mcp-stdio.js');

// ========== MODIFICATION 2: Update runQuery function signature ==========
// Location: Around line 360
// Add workflowyMcpPath parameter to the function signature:

async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,
  fastmailMcpPath: string,
  workflowyMcpPath: string,  // ADD THIS LINE
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)

// ========== MODIFICATION 3: Add to allowedTools array ==========
// Location: Around line 442, in the allowedTools array
// Add these entries:

allowedTools: [
  // ... existing tools ...
  'mcp__workflowy__workflowy_list_targets',
  'mcp__workflowy__workflowy_create_node',
  'mcp__workflowy__workflowy_update_node',
  'mcp__workflowy__workflowy_get_node',
  'mcp__workflowy__workflowy_list_children',
  'mcp__workflowy__workflowy_move_node',
  'mcp__workflowy__workflowy_delete_node',
  'mcp__workflowy__workflowy_complete_node',
  'mcp__workflowy__workflowy_uncomplete_node',
  'mcp__workflowy__workflowy_export_all',
]

// ========== MODIFICATION 4: Add WorkFlowy MCP server to servers array ==========
// Location: Around line 476, after Fastmail server
// Add this server configuration:

{
  command: 'node',
  args: [workflowyMcpPath],
  env: {
    WORKFLOWY_API_KEY: process.env.WORKFLOWY_API_KEY,
  },
}

// ========== MODIFICATION 5: Update runQuery call sites ==========
// Location: Multiple locations where runQuery is called
// Add workflowyMcpPath as parameter (after fastmailMcpPath):

await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,  // ADD THIS
  containerInput,
  sdkEnv,
  resumeAt,
)

// ========== PATTERN NOTES ==========
//
// This follows the standard NanoClaw MCP integration pattern:
// 1. Declare the compiled .js path
// 2. Add to runQuery signature
// 3. Whitelist tools in allowedTools
// 4. Configure server with env vars
// 5. Pass path to all runQuery calls
//
// The WorkFlowy MCP server will be automatically started by the Agent SDK
// when the container runs, and tools will be available via mcp__workflowy__* prefix.
