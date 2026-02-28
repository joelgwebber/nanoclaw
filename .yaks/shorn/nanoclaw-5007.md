---
id: nanoclaw-5007
title: Add suggest-improvement skill for agent-created yaks
type: feature
priority: 2
created: '2026-02-28T18:09:18Z'
updated: '2026-02-28T18:09:25Z'
commit: 72dd43d
---

Allow Sparky to propose NanoClaw improvements by creating Yaks tasks instead of making direct changes. Provides safety mechanism for self-improvement suggestions.

Features:
- Proactive triggers for limitations, tech debt, performance issues
- Manual invocation for explicit improvement requests
- Required approval before creating yaks (prevents spam)
- Rate limiting: max 1 suggestion per conversation
- Priority guidelines (p1/p2/p3)

Implementation:
- Created .claude/skills/suggest-improvement/SKILL.md with full documentation
- Added guidance section to groups/main/CLAUDE.md
- Committed as 72dd43d
