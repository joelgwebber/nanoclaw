// This file shows the modifications needed for add-seafile skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION 1: Add seafile MCP server path ==========
// Location: Around line 544, after other MCP path declarations

const seafileMcpPath = path.join(__dirname, 'seafile-mcp-stdio.js');

// ========== MODIFICATION 2: Update runQuery function signature ==========
// Location: Around line 360
// Add seafileMcpPath parameter to the function signature:

async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,  // ADD THIS LINE
  fastmailMcpPath: string,
  workflowyMcpPath: string,
  readeckMcpPath: string,
  substackMcpPath: string,
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)

// ========== MODIFICATION 3: Add to allowedTools array ==========
// Location: Around line 436, in the allowedTools array
// Add this entry:

allowedTools: [
  // ... existing tools ...
  'mcp__seafile__*',  // ADD THIS LINE
]

// ========== MODIFICATION 4: Add Seafile MCP server to servers config ==========
// Location: Around line 460, in the servers configuration
// Add this conditional server:

...(containerInput.isMain && sdkEnv.SEAFILE_URL && sdkEnv.SEAFILE_TOKEN ? {
  seafile: {
    command: 'node',
    args: [seafileMcpPath],
    env: {
      SEAFILE_URL: sdkEnv.SEAFILE_URL,
      SEAFILE_TOKEN: sdkEnv.SEAFILE_TOKEN,
      SEAFILE_LOCAL_PATH: sdkEnv.SEAFILE_LOCAL_PATH,
    },
  },
} : {}),

// ========== MODIFICATION 5: Update runQuery call sites ==========
// Location: Around line 575, where runQuery is called
// Add seafileMcpPath as parameter:

const queryResult = await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,  // ADD THIS PARAMETER
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,
  substackMcpPath,
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
// 4. Configure server with env vars (conditional on isMain + credentials)
// 5. Pass path to all runQuery calls
//
// Note: Seafile uses 3 environment variables (URL, TOKEN, LOCAL_PATH).
// The LOCAL_PATH is optional - if not set, hybrid access falls back to API-only.
//
// The `containerInput.isMain` check ensures Seafile tools are only available
// in the main channel for security (same pattern as other integrations).
