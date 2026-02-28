---
id: nanoclaw-e983
title: Create add-seafile skill
type: task
priority: 2
created: '2026-02-28T16:38:31Z'
updated: '2026-02-28T16:51:20Z'
commit: de9c954
---

Need to create skill for Seafile integration. Implementation exists:
- seafile-mcp-stdio.ts with hybrid local/API access
- Authentication: SEAFILE_URL, SEAFILE_TOKEN
- Tools: seafile_list_libraries, seafile_list_directory, seafile_read_file, seafile_write_file, seafile_upload_file, seafile_search, seafile_create_share_link
- Hybrid local filesystem + API fallback for reliability
- Share link creation for images/documents (stopgap for WhatsApp image sending)
- API v2.1 endpoints for share links (password protection, expiration)
- Wiring in index.ts with conditional registration
- Secrets in container-runner.ts
- Documentation in CLAUDE.md with usage guidelines
