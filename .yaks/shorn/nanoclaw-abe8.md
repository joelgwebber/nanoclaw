---
id: nanoclaw-abe8
title: Create add-substack skill
type: task
priority: 2
created: '2026-02-28T16:38:24Z'
updated: '2026-02-28T16:48:48Z'
commit: dff097c
---

Need to create skill for Substack integration. Implementation exists:
- substack-mcp-stdio.ts (387 lines)
- Cookie auth: SUBSTACK_SID (required), SUBSTACK_LLI (optional)
- Tools: substack_get_saved_articles, substack_get_article, substack_remove_saved_article
- HTML-to-markdown conversion using cheerio
- Endpoint: /api/v1/reader/posts?inboxType=saved
- Delete endpoint: DELETE /api/v1/posts/saved with post_id
- Wiring in index.ts with conditional registration (isMain check)
- Secrets in container-runner.ts
- Documentation in CLAUDE.md with workflow examples
