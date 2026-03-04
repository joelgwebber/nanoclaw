// This file shows the modifications needed for add-readeck skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION 1: Add readeck MCP server path ==========
// Location: Around line 550, after other MCP path declarations

const readeckMcpPath = path.join(__dirname, 'readeck-mcp-stdio.js');

// ========== MODIFICATION 2: Update runQuery function signature ==========
// Location: Around line 360
// Add readeckMcpPath parameter to the function signature:

async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,
  fastmailMcpPath: string,
  workflowyMcpPath: string,
  readeckMcpPath: string,  // ADD THIS LINE
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)

// ========== MODIFICATION 3: Add to allowedTools array ==========
// Location: Around line 442, in the allowedTools array
// Add these two entries:

allowedTools: [
  // ... existing tools ...
  'mcp__readeck__list_bookmarks',
  'mcp__readeck__get_bookmark',
  'mcp__readeck__add_bookmark',
  'mcp__readeck__update_bookmark',
  'mcp__readeck__archive_bookmark',
  'mcp__readeck__delete_bookmark',
  'mcp__readeck__search_bookmarks',
]

// ========== MODIFICATION 4: Add Readeck MCP server to servers array ==========
// Location: Around line 476, after WorkFlowy server
// Add this server configuration:

{
  command: 'node',
  args: [readeckMcpPath],
  env: {
    READECK_URL: process.env.READECK_URL,
    READECK_API_KEY: process.env.READECK_API_KEY,
  },
}

// ========== MODIFICATION 5: Update runQuery call sites ==========
// Location: Multiple locations where runQuery is called
// Add readeckMcpPath as parameter (after workflowyMcpPath):

await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,  // ADD THIS
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
// The Readeck MCP server will be automatically started by the Agent SDK
// when the container runs, and tools will be available via mcp__readeck__* prefix.
