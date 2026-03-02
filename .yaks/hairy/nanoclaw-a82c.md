---
id: nanoclaw-a82c
title: Research and implement skills marketplace/sharing for NanoClaw
type: feature
priority: 3
created: '2026-03-01T21:25:32Z'
updated: '2026-03-01T21:25:32Z'
---

Investigate and potentially implement a standardized way to share NanoClaw skills, similar to MCP server marketplaces.

## Current State: Ad Hoc Sharing

You're right - skill sharing is currently ad hoc:
- People share ideas and examples informally
- No centralized repository for NanoClaw-specific skills
- Skills live in .claude/skills/ but no discovery mechanism
- Users must manually find, copy, and adapt skills

## What Exists: MCP Server Marketplaces

The MCP ecosystem has multiple thriving marketplaces (as of 2026):

**Major Directories:**
1. **MCP.so** - 18,014 MCP servers collected
2. **PulseMCP** - 8,600+ servers, updated daily
3. **Awesome MCP Servers** (mcpservers.org) - Curated marketplace with submission process
4. **MCP Market** (mcpmarket.com) - Discovery and sharing platform
5. **LobeHub MCP Marketplace** - Categorized listings
6. **AI Agents List** - 593+ servers by category

**Features:**
- Categorized listings (Search, Communication, Productivity, Database, etc.)
- Submission processes
- Official vs community markers
- Sponsor/premium listings
- Regular updates

## Official Anthropic Skills System (Jan 2026)

Anthropic launched Agent Skills as an open standard with:
- SKILL.md format (YAML frontmatter + markdown)
- Progressive disclosure (3-level loading)
- Cross-platform portability
- Official marketplace via anthropics/skills

**Where Skills Live:**
- Personal: ~/.claude/skills/
- Project: .claude/skills/
- Plugins: Via Claude Code Plugins system

**Sharing Mechanisms:**
1. **Claude.ai**: Individual upload (zip files), not org-shared
2. **Claude API**: Workspace-wide via /v1/skills endpoint
3. **Claude Code**: Filesystem-based, shareable via plugins
4. **Agent SDK**: Filesystem, auto-discovered from .claude/skills/

**Official Directory:** Anthropic provides partner-built skills directory (Jan 26, 2026 update)

## Gap: No NanoClaw-Specific Marketplace

**What's Missing:**
- Centralized discovery for NanoClaw skills
- Quality curation/ratings
- Installation automation
- Dependency management
- Version tracking
- Security auditing
- Community contributions

**Current Workaround:**
- Check GitHub issues/discussions
- Search Twitter/Discord for examples
- Read blog posts (like jagans.substack.com)
- Manual copy/paste from examples

## Proposed Solutions

### Option A: GitHub-Based Marketplace (Simplest)

**Implementation:**
1. Create nanoclaw-skills GitHub org/repo
2. Structure: skills/{category}/{skill-name}/
3. Each skill = directory with SKILL.md
4. README with catalog, categories, ratings
5. Users clone or download specific skills
6. Community PRs for new skills

**Pros:**
- Familiar workflow (like Awesome lists)
- Version control built-in
- Free hosting
- Pull request workflow for quality
- GitHub stars for popularity

**Cons:**
- Manual installation
- No automated updates
- Limited discoverability vs web UI
- No built-in security scanning

**Example Structure:**


### Option B: Web-Based Marketplace (Like MCP.so)

**Implementation:**
1. Build web app (Next.js/React)
2. Database: PostgreSQL for skill metadata
3. Storage: GitHub/S3 for skill files
4. Features:
   - Browse by category, popularity, recent
   - Search and filtering
   - One-click install (via CLI or download)
   - User ratings/reviews
   - Submit new skills via web form
   - Automated testing/validation

**Pros:**
- Better discoverability
- Rich metadata (screenshots, demos)
- Community engagement (ratings, comments)
- Analytics (download counts, trends)
- Potential for monetization

**Cons:**
- Requires hosting/maintenance
- Development effort
- Ongoing costs
- Moderation needs

### Option C: Plugin System (Like Claude Code Plugins)

Extend NanoClaw to support plugins:

**Features:**
1. Plugin manifest (plugin.json)
2. Install via command: /plugin:install {url-or-name}
3. Auto-discover from ~/.claude/plugins/
4. Dependency resolution
5. Update notifications
6. Plugin registry API

**Implementation:**


**Pros:**
- Native to NanoClaw
- Automated installation
- Dependency management
- Version updates

**Cons:**
- Significant dev effort
- Plugin API surface to maintain
- Breaking changes risk

### Option D: Leverage Existing MCP Marketplaces

NanoClaw skills ARE MCP servers, so:

**Strategy:**
1. Tag NanoClaw-compatible skills in existing marketplaces
2. Submit NanoClaw skills to MCP.so, PulseMCP, etc.
3. Add "nanoclaw" tag/category
4. Document installation for NanoClaw users
5. Contribute to awesome-mcp-servers

**Pros:**
- Existing infrastructure
- Large audience
- No maintenance burden
- Cross-pollination with broader MCP ecosystem

**Cons:**
- Less NanoClaw-specific
- Diluted among general MCP servers
- May miss NanoClaw-specific needs

## Recommended Approach

**Phase 1: GitHub Repo (Now)**
1. Create nanoclaw-community/skills repository
2. Organize by category
3. Add README catalog with descriptions
4. Accept community PRs
5. Document installation process

**Phase 2: Submit to MCP Marketplaces (Parallel)**
1. Tag skills with "nanoclaw" in existing marketplaces
2. Submit to MCP.so, PulseMCP, Awesome MCP Servers
3. Link from NanoClaw docs

**Phase 3: Enhanced Tooling (Later)**
1. CLI tool: nanoclaw-skills install {name}
2. Auto-copy to .claude/skills/
3. Dependency resolution
4. Update notifications

**Phase 4: Web Marketplace (If Demand Exists)**
1. Build dedicated site if community grows
2. Better UX than GitHub
3. Rich metadata, ratings, analytics

## What This Enables

**For Users:**
- "What skills are available?"
- "Install the Hardcover skill"
- "Show popular productivity skills"
- "Update all my skills"

**For Contributors:**
- Easy submission process
- Visibility for their work
- Community feedback
- Version tracking

**For Ecosystem:**
- Faster NanoClaw adoption
- Quality improvements through curation
- Best practices sharing
- Cross-pollination of ideas

## Example: GitHub-Based Catalog

**README.md:**
bash
# Manual
cd ~/.claude/skills/
git clone https://github.com/nanoclaw-community/skills.git temp
cp -r temp/productivity/calendar-sync ./
rm -rf temp

# Automated (future)
nanoclaw-skills install calendar-sync


## Security Considerations

Any skills marketplace needs:
1. **Code review** - All submissions audited
2. **Security scanning** - Automated checks for common issues
3. **Trusted sources** - Official vs community badges
4. **Sandboxing** - Skills run in containers (NanoClaw already does this)
5. **Reporting** - Mechanism to report malicious skills
6. **Versioning** - Pin to specific versions, not just "latest"

## Success Metrics

- Number of skills available
- Download/install counts
- Community contributions (PRs)
- User satisfaction (ratings)
- Reduction in "how do I..." questions

## References

- MCP.so: https://mcp.so/
- PulseMCP: https://www.pulsemcp.com/servers
- Awesome MCP Servers: https://mcpservers.org/
- MCP Market: https://mcpmarket.com/
- LobeHub: https://lobehub.com/mcp
- Anthropic Skills Docs: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- NanoClaw on GitHub: https://github.com/qwibitai/nanoclaw
- MCP Marketplaces Article: https://medium.com/demohub-tutorials/17-top-mcp-registries-and-directories

## Next Steps

1. Decide on approach (GitHub repo, web marketplace, or both)
2. Set up infrastructure (repo or site)
3. Seed with initial skills (hardcover, drive, seafile, etc.)
4. Document contribution process
5. Announce to NanoClaw community
6. Iterate based on feedback
