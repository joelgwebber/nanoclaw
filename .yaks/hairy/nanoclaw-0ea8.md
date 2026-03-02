---
id: nanoclaw-0ea8
title: Add Google Drive/Docs integration via MCP
type: feature
priority: 2
created: '2026-03-01T19:20:23Z'
updated: '2026-03-01T19:20:23Z'
---

Integrate Google Drive and Google Docs access for reading files and documents through existing MCP servers.

## Objective
Enable Sparky to:
1. Read Google Drive files and folder contents
2. Read Google Docs document content
3. (Optional) Search Drive, read/write Sheets, edit Docs

## Available MCP Servers (2026)

### Option A: google-drive-mcp (piotr-agier) - Most Comprehensive
**npm:** @piotr-agier/google-drive-mcp
**GitHub:** https://github.com/piotr-agier/google-drive-mcp
**Status:** Active (99 commits), Docker support

**Features:**
- Multi-format: Docs, Sheets, Slides, Calendar, regular files
- File ops: create, update, delete, rename, move, copy, upload, download
- Advanced search across Drive + Shared Drives
- Docs editing: surgical text insert/delete, tables, images, comments, rich formatting
- Calendar: full event management + Google Meet
- Permission management

**Auth:** OAuth 2.0 with auto-refresh
- Setup: Google Cloud project + OAuth consent screen + desktop credentials
- Client ID only (no secret needed)
- Tokens: 0600 permissions, auto-refresh
- Env var: GOOGLE_DRIVE_OAUTH_CREDENTIALS

### Option B: google-docs-mcp (a-bonus) - Markdown Workflow
**npm:** @a-bonus/google-docs-mcp
**GitHub:** https://github.com/a-bonus/google-docs-mcp

**Features:**
- Docs: read (multiple formats), edit text, styling, tables, markdown round-trip
- Sheets: read/write ranges, create, format, freeze, validation
- Drive: search, CRUD operations
- Unique: Markdown workflow (read as MD, edit locally, push back)
- Multi-account: GOOGLE_MCP_PROFILE for separate tokens

**Setup:**
1. Create OAuth credentials (enable APIs)
2. Auth: npx -y @a-bonus/google-docs-mcp auth
3. Add to MCP config with Client ID + Secret

### Option C: mcp-gdrive (isaacphi) - Lightweight
**GitHub:** https://github.com/isaacphi/mcp-gdrive
**Features:** List, read, search files + read/write Sheets

### Option D: Google Cloud Official MCP
**Docs:** https://docs.cloud.google.com/mcp/overview
**Features:** Enterprise-ready with org-level governance, security, access control

## OAuth Setup (Universal)

**Prerequisites:**


**Steps:**
1. Enable APIs in Google Cloud Console (Drive API, Docs API)
2. Configure OAuth Consent Screen:
   - App name, support email
   - Audience: Internal or External
   - Scopes: drive.metadata.readonly, documents.readonly (or full access)
3. Create Credentials:
   - Type: Desktop app
   - Download credentials.json
4. First auth:
   - User visits localhost auth page
   - Grants permissions
   - Token saved to token.json (auto-refresh thereafter)

**Scopes:**
- Read-only metadata: https://www.googleapis.com/auth/drive.metadata.readonly
- Read-only docs: https://www.googleapis.com/auth/documents.readonly
- Full Drive: https://www.googleapis.com/auth/drive
- Full Docs: https://www.googleapis.com/auth/documents

## Reading Files/Docs (Direct API)

If not using MCP server, direct API usage:

**Google Drive - List Files:**


**Google Docs - Read Content:**


## Recommended Implementation Path

**Phase 1: Basic Read Access**
1. Use google-drive-mcp (piotr-agier) - most mature, comprehensive
2. Set up OAuth credentials (one-time user flow)
3. Configure MCP server in NanoClaw container
4. Test: list files, read Docs content

**Phase 2: Enhanced Features**
1. Add search capability
2. Support Sheets reading
3. Add Shared Drives access

**Phase 3: Write Capabilities** (if needed)
1. Enable Docs editing (surgical text operations)
2. Add file upload/creation
3. Consider google-docs-mcp for markdown workflow

## Container Integration

**Environment Setup:**


**Volume Mount:**
- credentials.json → /workspace/secrets/
- token.json → /workspace/secrets/ (persistent)

**MCP Config:**
Add to .claude/mcp-config.json or equivalent:


## Security Considerations

1. **Token Storage:** Store token.json securely, 0600 permissions
2. **Scope Limitation:** Start with read-only scopes
3. **Credential Rotation:** Refresh tokens expire after ~6 months of inactivity
4. **Audit Logging:** Google Cloud logs all API access

## Alternative: Service Account (Bot Access)

For automated access without user interaction:
1. Create Service Account in Google Cloud
2. Share Drive files/folders with service account email
3. Use service account credentials (no OAuth flow)
4. Limited to shared resources only

## References

- google-drive-mcp: https://github.com/piotr-agier/google-drive-mcp
- google-docs-mcp: https://github.com/a-bonus/google-docs-mcp
- Google Drive API Quickstart: https://developers.google.com/drive/api/quickstart/python
- Google Docs API: https://developers.google.com/docs/api/quickstart/python
- OAuth 2.0 Guide: https://googleapis.github.io/google-api-python-client/docs/oauth-installed.html
- Google Cloud MCP: https://docs.cloud.google.com/mcp/overview

## Next Steps

1. Choose MCP server (recommend google-drive-mcp)
2. Create Google Cloud project
3. Set up OAuth credentials
4. Test locally with user auth flow
5. Integrate into NanoClaw container
6. Document setup for Joel
