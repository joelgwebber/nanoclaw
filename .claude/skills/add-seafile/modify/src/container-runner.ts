// This file shows the modifications needed for add-seafile skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION: Add Seafile credentials to readSecrets ==========
// Location: Around line 216, in the readSecrets() function
// Add these entries to the array:

function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'SEAFILE_URL',      // ADD THIS LINE
    'SEAFILE_TOKEN',    // ADD THIS LINE
    'FASTMAIL_EMAIL',
    'FASTMAIL_APP_PASSWORD',
    'WORKFLOWY_API_KEY',
    'READECK_URL',
    'READECK_API_KEY',
    'SUBSTACK_SID',
    'SUBSTACK_LLI'
  ]);
}

// ========== PATTERN NOTES ==========
//
// The readSecrets() function loads environment variables from .env and passes
// them to the container as environment variables. This is the bridge between:
//
// .env file → systemd/launchd → Node.js process → container environment
//
// Why this is needed:
// - Containers are isolated and don't inherit environment variables
// - Secrets must be explicitly passed for security/auditability
// - The Agent SDK running inside the container needs these to configure MCP servers
//
// Seafile requires two credentials:
// - SEAFILE_URL: Base URL of the Seafile instance
// - SEAFILE_TOKEN: API token for authentication
//
// Optional: SEAFILE_LOCAL_PATH can be added here if you want to support hybrid
// local/API access. If not in readSecrets(), it won't be passed to container.
//
// Order doesn't matter, but keeping them alphabetically grouped by integration
// makes the code easier to scan.
