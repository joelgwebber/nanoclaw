# Git Hooks

This directory contains git hook templates for NanoClaw development.

## pre-commit

Warns when integration code changes without corresponding skill updates.

**Install**:
```bash
cp hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

**What it does**:
- Detects changes to MCP server files (`container/agent-runner/src/*-mcp-stdio.ts`)
- Detects changes to IPC handlers (`src/*-ipc.ts`, `src/channels/*.ts`)
- Warns if corresponding `.claude/skills/add-*` directories weren't updated
- Doesn't block commits (warning only)

**Example**:
```bash
$ git commit -m "Add new Readeck tool"
⚠️  SKILL SYNC WARNING ⚠️

  Modified: container/agent-runner/src/readeck-mcp-stdio.ts
  → Consider updating: .claude/skills/add-readeck/
    (Readeck MCP server)

  Reminder: Skills are reconstitution instructions.
  If your code changes affect how to install/configure the integration,
  update the corresponding skill's SKILL.md and modify/ directory.

  To proceed anyway: git commit --no-verify
```

**Maintenance**:
When adding new integrations, update the `mappings` array in `hooks/pre-commit` to include the new file-to-skill mapping.
