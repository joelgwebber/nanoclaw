// This file shows the modifications needed for add-substack skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION 1: Add substack MCP server path ==========
// Location: Around line 552, after readeckMcpPath

const substackMcpPath = path.join(__dirname, 'substack-mcp-stdio.js');

// ========== MODIFICATION 2: Update runQuery function signature ==========
// Location: Around line 360
// Add substackMcpPath parameter to the function signature:

async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,
  fastmailMcpPath: string,
  workflowyMcpPath: string,
  readeckMcpPath: string,
  substackMcpPath: string,  // ADD THIS LINE
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)

// ========== MODIFICATION 3: Add to allowedTools array ==========
// Location: Around line 444, in the allowedTools array
// Add this entry:

allowedTools: [
  // ... existing tools ...
  'mcp__substack__*',  // ADD THIS LINE
]

// ========== MODIFICATION 4: Add Substack MCP server to servers config ==========
// Location: Around line 500, after the Readeck server config
// Add this conditional server:

...(containerInput.isMain && sdkEnv.SUBSTACK_SID ? {
  substack: {
    command: 'node',
    args: [substackMcpPath],
    env: {
      SUBSTACK_SID: sdkEnv.SUBSTACK_SID,
      SUBSTACK_LLI: sdkEnv.SUBSTACK_LLI || '1',
    },
  },
} : {}),

// ========== MODIFICATION 5: Update runQuery call sites ==========
// Location: Around line 590, where runQuery is called
// Add substackMcpPath as parameter:

const queryResult = await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,
  substackMcpPath,  // ADD THIS PARAMETER
  containerInput,
  sdkEnv,
  resumeAt
);

// ========== PATTERN NOTES ==========
//
// This follows the standard NanoClaw MCP integration pattern:
// 1. Declare the compiled .js path
// 2. Add to runQuery signature
// 3. Whitelist tools in allowedTools (using wildcard pattern)
// 4. Configure server with env vars (conditional on isMain + SUBSTACK_SID)
// 5. Pass path to all runQuery calls
//
// Note: SUBSTACK_LLI defaults to "1" if not provided.
// The `containerInput.isMain` check ensures Substack tools are only available
// in the main channel for security (same pattern as other integrations).
