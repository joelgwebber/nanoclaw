# Intent: groups/main/CLAUDE.md additions

## What this section does

**Documents** the Substack tools available to the agent and provides usage guidance for the article migration workflow.

## Why this file

`groups/main/CLAUDE.md` is the **agent's memory** for the main channel. It contains:
- Available tools and how to use them
- System context and constraints
- User preferences and patterns
- Workflow guidance

When the agent runs, this entire file is included in the system prompt. It's how the agent knows what tools it has access to and how to use them properly.

## What we're adding

A complete **Substack Saved Articles** section that includes:

1. **Overview**: What Substack integration provides (access to saved articles)
2. **Authentication context**: Cookie-based auth (user doesn't need to know details, but agent should understand it)
3. **Tool reference**: All 3 tools with parameters and descriptions
4. **Workflow guidance**: Step-by-step workflow for migrating articles to Readeck
5. **Examples**: Concrete code showing how to call each tool

## Key documentation decisions

### 1. Lead with the Workflow

```markdown
### Workflow: Moving Saved Articles to Readeck

1. List your saved Substack articles
2. For each article, get the full content
3. Save it to Readeck
4. Remove it from Substack saved list
```

**Why workflow-first**: This integration has a specific purpose (migrate to Readeck). Starting with the workflow gives the agent immediate context for how to use these tools together.

**Unlike other integrations**: Seafile, WorkFlowy, Readeck are general-purpose tools. Substack is workflow-specific. The documentation reflects this.

### 2. Authentication Section

```markdown
### Authentication

Substack authentication requires two cookies stored as environment variables:
- `SUBSTACK_SID` - Session ID cookie (required)
- `SUBSTACK_LLI` - Login identifier cookie (optional, improves paid content access)

These are automatically configured when available.
```

**Why include this**: Unlike API keys (which are stable), cookies expire. If the agent gets authentication errors, this context helps it suggest checking cookies.

**Why "automatically configured"**: The agent doesn't need to configure them (that's already done), but knowing they exist helps with troubleshooting.

### 3. Tool Parameter Documentation

```markdown
**mcp__substack__substack_get_saved_articles**
- Parameters: `limit` (optional, default: 20, max: 100)
- Returns: Title, author, publication, subdomain, slug, URL, engagement stats
```

**Subdomain and slug**: These are critical for the next step (`substack_get_article`). The documentation explicitly calls them out so the agent knows to extract them.

**Engagement stats**: Likes, comments, restacks are returned but not always used. Included for completeness.

### 4. Concrete Workflow Example

```markdown
1. List your saved Substack articles:
   mcp__substack__substack_get_saved_articles(limit=20)

2. For each article, get the full content:
   mcp__substack__substack_get_article(subdomain="platformer", slug="article-title")

3. Save it to Readeck:
   mcp__readeck__readeck_create_bookmark(url="https://platformer.substack.com/p/article-title", tags=["substack", "tech"])

4. Remove it from Substack saved list:
   mcp__substack__substack_remove_saved_article(post_id=12345)
```

**Why step-by-step**: This is a multi-tool workflow. Without clear steps, the agent might miss a step (e.g., forget to remove from Substack after saving to Readeck).

**Why concrete examples**: Shows exact syntax with realistic values (subdomain "platformer", post_id 12345). The agent can pattern-match.

**Cross-integration**: References Readeck tools. This is the first integration documentation that explicitly shows how to use multiple integrations together.

### 5. Usage Examples (Redundant but Useful)

```markdown
### Usage Examples

Get saved articles:
mcp__substack__substack_get_saved_articles(limit=10)
```

**Why repeat**: The workflow section shows multi-step usage. This section shows individual tool usage (useful if agent just needs one tool, not the full workflow).

**Different from workflow**: Workflow is prescriptive ("do this"). Examples are descriptive ("this is how you call it").

## Formatting conventions

Same as other integrations:

- **Bold** for tool names
- Inline `code` for parameters
- Fenced code blocks for examples
- Numbered lists for workflows
- Bullet lists for feature descriptions

## Where this section goes

**Location**: After Readeck section, before any other integration docs.

**Why this order**: Substack → Readeck migration is a common workflow. Putting them adjacent makes the documentation easier to navigate.

**Logical grouping**: Both are content management tools (reading list / bookmarks).

## What the agent learns

After reading this section, the agent knows:

1. ✅ Substack tools exist and are available
2. ✅ What each tool does (3 tools total)
3. ✅ How to call each tool (parameters and syntax)
4. ✅ The primary workflow: migrate articles to Readeck
5. ✅ That authentication is cookie-based and may expire
6. ✅ That subdomain and slug are needed for get_article
7. ✅ Concrete examples for the full workflow

## What's NOT documented

**Internal implementation**: How the MCP server works, API endpoints, HTML parsing. The agent doesn't need this.

**Troubleshooting**: That's for the skill documentation (SKILL.md), not the agent's memory.

**Setup steps**: Already done. The agent just needs to know how to USE the tools.

**Cookie extraction**: How to get cookies from browser is a user task, not agent task.

## Why workflow-focused?

**Question**: Why does this integration emphasize workflow more than others?

**Answer**: Narrow use case.

**Other integrations** (Seafile, WorkFlowy, Readeck):
- General-purpose tools
- Many possible workflows
- Documentation focuses on individual tool capabilities

**Substack integration**:
- Specific use case: migrate saved articles
- Tools are designed for this workflow
- Documentation reflects the intended usage pattern

**Alternative considered**: Could document tools individually without workflow context. But then agent might not understand how to chain them together.

## Cross-integration documentation

**First example** of an integration that explicitly references another integration (Readeck) in its documentation.

**Why this works**:
- Both integrations are available in main channel
- The workflow is common and useful
- Showing the cross-integration usage teaches the agent patterns

**Future integrations**: Could document more cross-integration workflows (e.g., "Save Fastmail attachments to Seafile").

## Testing the documentation

After adding this section and restarting:

1. **Ask the agent**: "What Substack tools do you have?"
   - Should list all 3 tools accurately

2. **Request the workflow**: "Migrate my Substack articles to Readeck"
   - Should follow the 4-step workflow
   - Should handle batching (loop over articles)

3. **Check logs**: Agent should invoke tools in correct order without retrying

## Maintenance

**When to update**:
- New Substack tools added → document them
- Tool parameters change → update signatures
- New workflows emerge → add to examples
- Common mistakes → add to guidance

**Who updates**: Whoever modifies the MCP server should update this doc in the same commit.

## Relationship to SKILL.md

| SKILL.md | CLAUDE.md |
|----------|-----------|
| How to install integration | How to use installed tools |
| Cookie extraction process | Cookie-based auth context |
| Container rebuild steps | N/A |
| Troubleshooting | N/A |
| For humans (setting up) | For agent (using tools) |

They're complementary: SKILL.md explains HOW to add Substack, CLAUDE.md explains HOW to use Substack.

## Unique aspects of Substack documentation

Compared to other integrations (Seafile, Readeck, WorkFlowy):

1. **Workflow-first approach**: Leads with the migration workflow
2. **Cross-integration**: First to explicitly reference another integration (Readeck)
3. **Authentication context**: Explains cookie-based auth and expiration
4. **Limited scope**: Only 3 tools vs 9 (Seafile) or 7 (Readeck)
5. **Batch operation guidance**: Implies looping over articles ("for each article")

These reflect the specialized nature of the integration.
