---
id: nanoclaw-0ec1
title: Add reMarkable tablet integration via cloud API
type: feature
priority: 2
created: '2026-03-01T17:38:50Z'
updated: '2026-03-01T17:38:50Z'
---

Create MCP integration for reMarkable tablet to pull pages for OCR and push PDFs back via cloud API.

## Objectives
1. Extract pages from notebooks as images/PDFs for OCR
2. Upload PDFs to reMarkable cloud
3. (Bonus) Insert pages into existing notebooks

## Authentication Flow (Cloud API)
- User generates 8-char one-time code from my.remarkable.com/device/desktop/connect
- Exchange code for device token via POST to /token/json/2/device/new
- Use device token to get user token (expires <24h) via /token/json/2/user/new
- Store device token, refresh user token per session
- Auth method: Bearer token in headers

## Reading Pages (Pull)
Two-step process:
1. GET /document-storage/json/2/docs?doc=[ID]&withBlob=true
2. Download ZIP from BlobURLGet (Google Cloud Storage URL)
3. Parse .rm v6 files using rmscene/rmc libraries
4. Convert to PDF/SVG/PNG for OCR

Libraries:
- rmscene (Python): Read v6 .rm files (current format)
- rmc (Python, v0.3.0 Mar 2025): Convert v6 to PDF/SVG/markdown
- remarkable-mcp: Existing MCP server (read-only, SSH/Cloud modes)

## Writing PDFs (Push)
Three-step upload:
1. PUT /upload/request → get BlobURLPut
2. Upload ZIP file to BlobURLPut (Google Cloud Storage)
3. PUT /upload/update-status with metadata

ZIP contents: .rm files + metadata.json + content files

Libraries:
- rmcl (Python): Async cloud library with .upload() method
- remapy (Python): Sync alternative, upload via cloud

## Appending to Existing Notebooks
Challenge: Cloud API doesn't support direct page append
Workaround:
1. Download existing notebook ZIP
2. Parse .rm files locally
3. Add new pages (increment page numbers)
4. Re-upload complete modified notebook
5. Requires understanding .rm v6 format structure

## Proposed Architecture
Option A: Extend remarkable-mcp
- Fork/extend existing read-only MCP server
- Add write capabilities using rmcl/remapy
- Cloud mode only (no SSH requirement)

Option B: New MCP server
- Use rmcl for cloud API (async)
- Use rmscene/rmc for .rm parsing/conversion
- Implement auth token management
- Support both read and write operations

## Implementation Path
1. Start with remarkable-mcp codebase (proven cloud auth)
2. Add rmcl for write operations
3. Implement PDF upload (simpler case)
4. Add page extraction using rmc
5. (Phase 2) Implement notebook page appending

## Risks & Mitigation
- Protocol changes: reMarkable updated sync protocol recently, many projects archived
- Mitigation: Use cloud API (more stable), be ready to adapt
- No official API: All reverse-engineered
- Mitigation: Plan to migrate when official API releases

## References
- Authentication: https://akeil.de/posts/remarkable-cloud-api/
- remarkable-mcp: https://github.com/SamMorrowDrums/remarkable-mcp
- rmcl: https://github.com/rschroll/rmcl
- rmscene: https://github.com/ricklupton/rmscene
- rmc: https://github.com/ricklupton/rmc
- File format: https://plasma.ninja/blog/devices/remarkable/binary/format/2017/12/26/reMarkable-lines-file-format.html
