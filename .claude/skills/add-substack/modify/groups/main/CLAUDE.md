```markdown
---

## Substack Saved Articles

You have access to Substack via MCP tools. These tools allow you to access your saved articles from your Substack reading list.

### Authentication

Substack authentication requires two cookies stored as environment variables:
- `SUBSTACK_SID` - Session ID cookie (required)
- `SUBSTACK_LLI` - Login identifier cookie (optional, improves paid content access)

These are automatically configured when available.

### Available Substack Tools

**mcp__substack__substack_get_saved_articles**
- Get all articles saved to your Substack reading list
- Parameters: `limit` (optional, default: 20, max: 100)
- Returns: Title, author, publication, subdomain, slug, URL, engagement stats
- Articles are sorted by publish date, newest first

**mcp__substack__substack_get_article**
- Get full content of a Substack article as markdown
- Parameters: `subdomain` (required, e.g. "platformer"), `slug` (required, e.g. "my-article-title")
- Returns: Full article content with metadata (title, subtitle, author, date, engagement stats)
- Automatically handles paid content if you're subscribed

**mcp__substack__substack_remove_saved_article**
- Remove an article from your Substack saved list
- Parameters: `post_id` (integer, from the saved articles list)
- Use this to clean up your reading list after archiving articles elsewhere

### Workflow: Moving Saved Articles to Readeck

1. List your saved Substack articles:
   \`\`\`
   mcp__substack__substack_get_saved_articles(limit=20)
   \`\`\`

2. For each article, get the full content:
   \`\`\`
   mcp__substack__substack_get_article(subdomain="platformer", slug="article-title")
   \`\`\`

3. Save it to Readeck:
   \`\`\`
   mcp__readeck__readeck_create_bookmark(url="https://platformer.substack.com/p/article-title", tags=["substack", "tech"])
   \`\`\`

4. Remove it from Substack saved list:
   \`\`\`
   mcp__substack__substack_remove_saved_article(post_id=12345)
   \`\`\`

### Usage Examples

\`\`\`
Get saved articles:
mcp__substack__substack_get_saved_articles(limit=10)

Get full article content:
mcp__substack__substack_get_article(subdomain="platformer", slug="why-elon-musk-bought-twitter")

Remove from saved list:
mcp__substack__substack_remove_saved_article(post_id=187132686)
\`\`\`
```

### 7. Validate

