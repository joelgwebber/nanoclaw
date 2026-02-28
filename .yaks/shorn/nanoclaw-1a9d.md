---
id: nanoclaw-1a9d
title: Update add-readeck skill with new API implementation
type: task
priority: 2
created: '2026-02-28T16:38:15Z'
updated: '2026-02-28T16:43:57Z'
commit: 107fd96
---

Current skill is outdated. Missing:
- formRequest() helper for form-encoded requests
- readeck_update_bookmark (PATCH with repeated labels params)
- readeck_mark_favorite (PATCH with is_marked)
- readeck_update_read_progress (PATCH with read_progress 0-100)
- readeck_list_labels (GET @complete endpoint)
- Interface changes: is_archived boolean vs status enum
- API changes: archived boolean vs status string
- Updated CLAUDE.md examples
