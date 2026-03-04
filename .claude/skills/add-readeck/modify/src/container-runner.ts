// This file shows the modifications needed for add-readeck skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION: Add Readeck credentials to readSecrets ==========
// Location: Around line 216, in the readSecrets() function
// Add these two entries to the array:

function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    // ... other existing secrets ...
    'SEAFILE_URL',
    'SEAFILE_TOKEN',
    'FASTMAIL_EMAIL',
    'FASTMAIL_APP_PASSWORD',
    'WORKFLOWY_API_KEY',
    'READECK_URL',      // ADD THIS LINE
    'READECK_API_KEY',  // ADD THIS LINE
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
// Order doesn't matter, but keeping them alphabetically grouped by integration
// makes the code easier to scan.
