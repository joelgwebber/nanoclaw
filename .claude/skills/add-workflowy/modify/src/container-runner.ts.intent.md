# Intent: src/container-runner.ts modifications

## What changed

**Added** `WORKFLOWY_API_KEY` to the `readSecrets()` function.

## Why this file

See add-readeck/modify/src/container-runner.ts.intent.md for detailed explanation of the environment variable flow and why explicit passthrough is required.

### WorkFlowy-specific notes

**Single variable**: WorkFlowy only needs `WORKFLOWY_API_KEY`. No URL configuration needed since the API endpoint is constant.

**Getting the API key**: Users generate this from WorkFlowy → Settings → API Access → Generate New Token.

**Security**: API keys are sensitive credentials with full account access. Never log them or commit them to git.
