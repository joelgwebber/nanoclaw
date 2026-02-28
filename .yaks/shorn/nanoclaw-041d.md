---
id: nanoclaw-041d
title: Verify add-workflowy skill is current
type: task
priority: 2
created: '2026-02-28T16:38:39Z'
updated: '2026-02-28T16:40:04Z'
commit: 107fd96
---

Check if add-workflowy skill matches current implementation.
- Added recently but should verify completeness
- Compare skill documentation against workflowy-mcp-stdio.ts
- Verify all tools documented: list_targets, create_node, update_node, get_node, list_children, move_node, delete_node, complete_node, uncomplete_node, export_all
- Check CLAUDE.md examples match current tool signatures
- Verify wiring instructions in index.ts are correct
- Confirm secrets handling in container-runner.ts is documented
