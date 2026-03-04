// This file shows the modifications needed for add-workflowy skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION: Add WorkFlowy API key to readSecrets ==========
// Location: Around line 216, in the readSecrets() function
// Add this entry to the array:

function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    // ... other existing secrets ...
    'SEAFILE_URL',
    'SEAFILE_TOKEN',
    'FASTMAIL_EMAIL',
    'FASTMAIL_APP_PASSWORD',
    'WORKFLOWY_API_KEY',  // ADD THIS LINE
  ]);
}

// ========== PATTERN NOTES ==========
//
// WorkFlowy only needs one environment variable (WORKFLOWY_API_KEY).
// Unlike Readeck or Seafile, there's no URL config - the API base URL
// is constant (https://workflowy.com/api/v1).
