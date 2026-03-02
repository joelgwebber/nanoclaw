---
id: nanoclaw-3dfd
title: Make yak suggestions introspectable from container
type: feature
priority: 3
created: '2026-03-01T17:51:42Z'
updated: '2026-03-02T00:33:51Z'
commit: af9927f
---

Currently, Sparky can create yaks via IPC but has no visibility into what yaks exist, their status, or progress. This makes it impossible to:

- Answer "what suggestions have we made?"
- Track which yaks are completed vs pending
- Avoid duplicate suggestions
- Reference existing yaks when making related suggestions
- Show progress on previously filed improvements

## Implementation Plan

**Chosen Approach**: Hybrid of Option A + C

1. **IPC Response Files** (Option A):
   - When creating yak, write response to /workspace/ipc/responses/
   - Immediate feedback with yak ID, title, status

2. **IPC Query Command** (Option C):
   - `{"type": "list_yaks", "status": "hairy|shearing|shorn|all"}`
   - `{"type": "list_yaks", "search": "keyword"}`
   - Controller writes results to /workspace/ipc/responses/

**Features**:
- Full transparency: show all yaks (not filtered by creator)
- List by status: hairy, shearing, shorn, or all
- Keyword search (leveraging yak.py's existing search)
- Returns: ID, title, type, priority, status, created/updated dates, description

**Privacy**: Full access to all yaks (user confirmed)

## Benefits

- Better user experience: "Show me pending suggestions"
- Avoids duplicate yak creation
- Enables progress tracking and reporting
- Supports yak hierarchies (parent/child relationships)
- Makes suggestion system more transparent
