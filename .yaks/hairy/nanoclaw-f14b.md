---
id: nanoclaw-f14b
title: 'File GH issue: Background agent outputs lost when container restarts'
type: task
priority: 2
created: '2026-02-27T18:27:16Z'
updated: '2026-02-27T18:27:16Z'
---

Title: Background agent outputs lost when container restarts - TaskOutput doesn't work across messages
Labels: bug, documentation

Problem

Background agents spawned with Task(run_in_background=true) complete successfully but their output files are lost
when the container exits. When the agent tries to check on the background task in a subsequent message, the output
file doesn't exist because it was written to the ephemeral container's /tmp directory.

Steps to Reproduce

1. Send a message that causes the agent to spawn a background task:
  Use a background agent to categorize all my Readeck bookmarks
2. Agent receives response from Task tool:
  {
    "agentId": "a9a100f",
    "output_file": "/tmp/claude-1000/-workspace-group/tasks/a9a100f.output"
  }
3. Container completes and exits (as designed)
4. Send a follow-up message:
  How is that background task going?
5. New container spawns for the new message
6. Agent tries to check the output file but it doesn't exist

Expected Behavior

Following the https://code.claude.com/docs/en/sub-agents:

Background agents can be launched by setting run_in_background to true, and "The tool result will include an output_file path - use Read tool or Bash tail to check on output."

The agent should be able to use the TaskOutput tool or read the output file to check on the background agent's progress and results.

Actual Behavior

- Output files are written to /tmp/claude-1000/ inside the container
- When the container exits, /tmp is lost
- TaskOutput tool exists in allowedTools but isn't documented in CLAUDE.md
- Agents don't know to use TaskOutput and can't access ephemeral output files anyway
- The background agent's work is lost despite completing successfully

Root Cause

NanoClaw's architecture spawns ephemeral containers per message:
1. Message arrives → new container spawns
2. Agent runs → may spawn background agents
3. Response sent → container exits
4. Background agent outputs in /tmp are lost

The Claude Agent SDK expects long-lived sessions where background agent outputs persist in /tmp. NanoClaw's container isolation breaks this assumption.

Evidence

The background agent does complete successfully - its full transcript is preserved at:
  .claude/projects/-workspace-group/{sessionId}/subagents/agent-{agentId}.jsonl

But the output file referenced in the Task tool response is gone.

Impact

- Background agents appear to fail or get "lost"
- Agents can't delegate long-running work reliably
- Users think the feature is broken when it actually completed

Proposed Solution

Symlink bridge + documentation:

1. Modify container entrypoint to create symlink from /tmp/claude-{UID}/-workspace-group to /workspace/group (which is mounted and persists)
2. Document TaskOutput tool in CLAUDE.md so agents know how to check on background tasks
3. Output files automatically land in persistent storage, transparent to the SDK

Additional Context

- Task, TaskOutput, and TaskStop tools are in allowedTools but undocumented
- The SDK_DEEP_DIVE.md mentions background agents but not the persistence issue
- This is likely an integration gap between Claude Agent SDK expectations and NanoClaw's container model

NOTE: We've already implemented the local fix (commit eedfc5a), but should still file this upstream to help other users.
