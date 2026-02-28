---
name: add-substack
description: Add Substack integration to NanoClaw as a tool for the main channel. Access saved articles from your Substack reading list and migrate them to Readeck or other systems.
---

# Add Substack Integration

This skill adds Substack support to NanoClaw as a tool available in the main channel. Substack integration allows you to access your saved articles, retrieve full content, and remove articles from your reading list.

## Phase 1: Pre-flight

### Check if already integrated

Check if Substack is already configured:

```bash
grep -q "SUBSTACK_SID" .env && echo "Already configured" || echo "Not configured"
grep -q "substack-mcp-stdio" container/agent-runner/src/index.ts && echo "Code integrated" || echo "Code not integrated"
```

If both show "Already configured" and "Code integrated", skip to Phase 3 (Verify).

### Get Substack Cookies

Ask the user:

> To access your Substack saved articles, I need two cookies from your browser:
> 1. `substack.sid` - Session ID cookie (required)
> 2. `substack.lli` - Login identifier cookie (optional, improves paid content access)
>
> Here's how to get them:
> 1. Open your browser and go to https://substack.com
> 2. Open Developer Tools (F12 or Cmd+Option+I)
> 3. Go to the "Application" or "Storage" tab
> 4. Find "Cookies" → "https://substack.com"
> 5. Look for `substack.sid` - copy its value
> 6. Look for `substack.lli` - copy its value (optional)
> 7. Paste them here

Wait for the user to provide:
- `SUBSTACK_SID` - The session ID cookie value (required)
- `SUBSTACK_LLI` - The login identifier cookie value (optional, defaults to "1")

## Phase 2: Apply Code Changes

### 1. Install Dependencies

The Substack MCP server requires `cheerio` for HTML-to-markdown conversion.

Update `container/agent-runner/package.json` to include cheerio:

```json
{
  "dependencies": {
    ...existing dependencies...,
    "cheerio": "^1.0.0"
  }
}
```

Then install:

```bash
cd container/agent-runner && npm install
```

### 2. Create MCP Server

Create `container/agent-runner/src/substack-mcp-stdio.ts`:

```typescript
/**
 * Substack MCP Server for NanoClaw
 * Provides access to Substack saved articles and content
 * Based on jenny-ouyang/substack-article-mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { load } from 'cheerio';

const SUBSTACK_SID = process.env.SUBSTACK_SID!;
const SUBSTACK_LLI = process.env.SUBSTACK_LLI || '1';

if (!SUBSTACK_SID) {
  console.error('SUBSTACK_SID environment variable is required');
  process.exit(1);
}

interface SubstackArticle {
  id: number;
  title: string;
  slug: string;
  subtitle: string;
  publishedAt: string;
  canonicalUrl: string;
  audience: string;
  publicationName: string;
  publicationSubdomain: string;
  authorName: string;
  likes: number;
  comments: number;
  restacks: number;
  wordCount?: number;
}

interface SubstackArticleFull extends SubstackArticle {
  bodyHtml: string;
  truncatedBodyText?: string;
}

function getCookieHeaders(): Record<string, string> {
  return {
    Cookie: `substack.sid=${SUBSTACK_SID}; substack.lli=${SUBSTACK_LLI}`,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };
}

async function apiRequest(url: string, options: RequestInit = {}): Promise<any> {
  const headers = {
    ...getCookieHeaders(),
    'Accept': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication failed. Check SUBSTACK_SID and SUBSTACK_LLI environment variables.');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Substack API error (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Simple HTML to Markdown conversion
 * Handles common elements found in Substack articles
 */
function htmlToMarkdown(html: string): string {
  const $ = load(html);

  // Remove script and style tags
  $('script, style').remove();

  // Convert common elements
  $('h1').replaceWith((_i: any, el: any) => `\\n# ${$(el).text()}\\n`);
  $('h2').replaceWith((_i: any, el: any) => `\\n## ${$(el).text()}\\n`);
  $('h3').replaceWith((_i: any, el: any) => `\\n### ${$(el).text()}\\n`);
  $('h4').replaceWith((_i: any, el: any) => `\\n#### ${$(el).text()}\\n`);
  $('strong, b').replaceWith((_i: any, el: any) => `**${$(el).text()}**`);
  $('em, i').replaceWith((_i: any, el: any) => `*${$(el).text()}*`);
  $('a').replaceWith((_i: any, el: any) => `[${$(el).text()}](${$(el).attr('href')})`);
  $('code').replaceWith((_i: any, el: any) => `\\`${$(el).text()}\\``);
  $('p').replaceWith((_i: any, el: any) => `\\n${$(el).html()}\\n`);
  $('br').replaceWith('\\n');
  $('hr').replaceWith('\\n---\\n');

  // Lists
  $('ul').replaceWith((_i: any, el: any) => {
    const items = $(el).find('li').map((_: any, li: any) => `- ${$(li).text()}`).get().join('\\n');
    return `\\n${items}\\n`;
  });
  $('ol').replaceWith((_i: any, el: any) => {
    const items = $(el).find('li').map((idx: any, li: any) => `${idx + 1}. ${$(li).text()}`).get().join('\\n');
    return `\\n${items}\\n`;
  });

  // Blockquotes
  $('blockquote').replaceWith((_i: any, el: any) => {
    const text = $(el).text().trim().split('\\n').map(line => `> ${line}`).join('\\n');
    return `\\n${text}\\n`;
  });

  let text = $.root().text();

  // Clean up excessive whitespace
  text = text.replace(/\\n{3,}/g, '\\n\\n');
  text = text.trim();

  return text;
}

/** Fetch article HTML page and extract body (for full paid content access) */
async function fetchArticleBodyFromPage(slug: string, subdomain: string): Promise<string> {
  const url = `https://${subdomain}.substack.com/p/${slug}`;
  const headers = {
    ...getCookieHeaders(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const response = await fetch(url, { headers });
  if (!response.ok) return '';

  const html = await response.text();
  const $ = load(html);

  const selectors = [
    '.body.markup',
    '[data-testid="post-body"]',
    '.post-body',
    '.body',
    '.entry-content',
    'article .body',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      const raw = el.html()?.trim();
      if (raw && raw.length > 500) return raw;
    }
  }

  return '';
}

const server = new McpServer({
  name: 'substack',
  version: '1.0.0',
});

// Get saved articles from user's reading list
server.tool(
  'substack_get_saved_articles',
  'Get articles saved to your Substack reading list. Returns title, author, publication, and URL for each saved article.',
  {
    limit: z.number().int().min(1).max(100).optional().describe('Number of articles to fetch (default: 20, max: 100)'),
  },
  async (args) => {
    try {
      const limit = args.limit || 20;
      const allItems: SubstackArticle[] = [];

      const params = new URLSearchParams({
        inboxType: 'saved',
        limit: String(limit),
      });

      const url = `https://substack.com/api/v1/reader/posts?${params}`;
      const json = await apiRequest(url);

      const posts = (json.posts || []) as Record<string, unknown>[];
      const pubs = (json.publications || []) as Record<string, unknown>[];

      // Build publication lookup
      const pubMap = new Map<number, Record<string, unknown>>();
      for (const pub of pubs) {
        pubMap.set(pub.id as number, pub);
      }

      for (const post of posts) {
        const pubId = post.publication_id as number;
        const pub = pubMap.get(pubId);
        const bylines = (post.publishedBylines || []) as Record<string, unknown>[];

        allItems.push({
          id: post.id as number,
          title: (post.title as string) || '',
          slug: (post.slug as string) || '',
          subtitle: (post.subtitle as string) || '',
          publishedAt: (post.post_date as string) || '',
          canonicalUrl: (post.canonical_url as string) || '',
          audience: (post.audience as string) || 'everyone',
          publicationName: (pub?.name as string) || '',
          publicationSubdomain: (pub?.subdomain as string) || '',
          authorName: (bylines[0]?.name as string) || (pub?.author_name as string) || '',
          likes: (post.reaction_count as number) || 0,
          comments: (post.comment_count as number) || 0,
          restacks: (post.restacks as number) || 0,
          wordCount: post.wordcount as number | undefined,
        });
      }

      if (allItems.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No saved articles found.' }],
        };
      }

      // Sort by publish date, newest first
      allItems.sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });

      const formatted = allItems
        .map((item, i) => {
          const paid = item.audience === 'only_paid' ? ' [PAID]' : '';
          const date = item.publishedAt
            ? new Date(item.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '';
          const stats = `${item.likes} likes, ${item.comments} comments`;

          return [
            `${i + 1}. **${item.title}**${paid}`,
            `   By ${item.authorName} in **${item.publicationName}**`,
            `   ${date} | ${stats}`,
            `   Subdomain: ${item.publicationSubdomain} | Slug: ${item.slug}`,
            `   URL: ${item.canonicalUrl}`,
          ].join('\\n');
        })
        .join('\\n\\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Saved articles (${allItems.length} total):\\n\\n${formatted}`,
        }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Get full article content
server.tool(
  'substack_get_article',
  'Get full content of a Substack article as markdown. Requires subdomain and slug from the saved articles list.',
  {
    subdomain: z.string().describe('Publication subdomain (e.g. "platformer")'),
    slug: z.string().describe('Article slug (e.g. "my-article-title")'),
  },
  async (args) => {
    try {
      // First try API endpoint
      const url = `https://${args.subdomain}.substack.com/api/v1/posts/${args.slug}`;
      const raw = await apiRequest(url);

      let bodyHtml = (raw.body_html as string) || '';
      const truncatedBodyText = raw.truncated_body_text as string | undefined;
      const wordCount = raw.wordcount as number | undefined;
      const isPaid = (raw.audience as string) === 'only_paid';

      // Check if content is truncated (common for paid articles)
      const likelyTruncated =
        !bodyHtml ||
        (truncatedBodyText != null && truncatedBodyText.length > 0) ||
        (wordCount != null && wordCount > 200 && bodyHtml.length < wordCount * 5);

      if (isPaid && likelyTruncated) {
        // Fetch full content from HTML page
        const fromPage = await fetchArticleBodyFromPage(args.slug, args.subdomain);
        if (fromPage.length > bodyHtml.length) bodyHtml = fromPage;
      }

      const paid = (raw.audience as string) === 'only_paid' ? ' [PAID]' : '';
      const date = raw.post_date
        ? new Date(raw.post_date as string).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';

      let markdown = '';
      markdown += `# ${(raw.title as string) || 'Untitled'}${paid}\\n\\n`;
      if (raw.subtitle) markdown += `*${raw.subtitle as string}*\\n\\n`;
      if (date) markdown += `Published: ${date}\\n`;
      markdown += `URL: ${raw.canonical_url as string}\\n`;
      markdown += `By: ${((raw.publishedBylines as Record<string, unknown>[])?.[0]?.name as string) || 'Unknown'}\\n`;
      markdown += `Publication: ${args.subdomain}.substack.com\\n`;
      if (wordCount) markdown += `Word count: ${wordCount}\\n`;
      markdown += '\\n---\\n\\n';

      if (bodyHtml) {
        markdown += htmlToMarkdown(bodyHtml);
      } else if (truncatedBodyText) {
        markdown += truncatedBodyText + '\\n\\n[Content truncated — you may not be subscribed to this newsletter\\'s paid tier]';
      } else {
        markdown += '(No article content available)';
      }

      return {
        content: [{ type: 'text' as const, text: markdown }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Remove article from saved list
server.tool(
  'substack_remove_saved_article',
  'Remove an article from your Substack saved list. Use the post ID from the saved articles list.',
  {
    post_id: z.number().int().describe('Post ID to remove from saved list'),
  },
  async (args) => {
    try {
      const url = 'https://substack.com/api/v1/posts/saved';
      const headers = {
        ...getCookieHeaders(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ post_id: args.post_id }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Check SUBSTACK_SID and SUBSTACK_LLI environment variables.');
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Substack API error (${response.status}): ${text}`);
      }

      return {
        content: [{ type: 'text' as const, text: `Successfully removed article ${args.post_id} from saved list.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

// Start the stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3. Wire into Agent Runner

Modify `container/agent-runner/src/index.ts`:

**Add path variable** (around line 552, after `readeckMcpPath`):

```typescript
const substackMcpPath = path.join(__dirname, 'substack-mcp-stdio.js');
```

**Update `runQuery` function signature** (around line 360):

```typescript
async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  seafileMcpPath: string,
  fastmailMcpPath: string,
  workflowyMcpPath: string,
  readeckMcpPath: string,
  substackMcpPath: string,  // ADD THIS LINE
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
)
```

**Add to `allowedTools` array** (around line 444):

```typescript
allowedTools: [
  'Bash',
  'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch',
  'Task', 'TaskOutput', 'TaskStop',
  'TeamCreate', 'TeamDelete', 'SendMessage',
  'TodoWrite', 'ToolSearch', 'Skill',
  'NotebookEdit',
  'mcp__nanoclaw__*',
  'mcp__seafile__*',
  'mcp__fastmail__*',
  'mcp__workflowy__*',
  'mcp__readeck__*',
  'mcp__substack__*'  // ADD THIS LINE
],
```

**Add MCP server configuration** (around line 500, after the Readeck server config):

```typescript
...(containerInput.isMain && sdkEnv.SUBSTACK_SID ? {
  substack: {
    command: 'node',
    args: [substackMcpPath],
    env: {
      SUBSTACK_SID: sdkEnv.SUBSTACK_SID,
      SUBSTACK_LLI: sdkEnv.SUBSTACK_LLI || '1',
    },
  },
} : {}),
```

**Update call site** (around line 590):

```typescript
const queryResult = await runQuery(
  prompt,
  sessionId,
  mcpServerPath,
  seafileMcpPath,
  fastmailMcpPath,
  workflowyMcpPath,
  readeckMcpPath,
  substackMcpPath,  // ADD THIS PARAMETER
  containerInput,
  sdkEnv,
  resumeAt
);
```

### 4. Add Credentials

Add to `.env`:

```bash
SUBSTACK_SID="<sid-cookie-from-user>"
SUBSTACK_LLI="<lli-cookie-from-user>"  # Optional, defaults to "1"
```

### 5. Pass Secrets to Container

Modify `src/container-runner.ts`:

In the `readSecrets()` function (around line 216), add `'SUBSTACK_SID'` and `'SUBSTACK_LLI'` to the array:

```typescript
function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'SEAFILE_URL',
    'SEAFILE_TOKEN',
    'FASTMAIL_EMAIL',
    'FASTMAIL_APP_PASSWORD',
    'WORKFLOWY_API_KEY',
    'READECK_URL',
    'READECK_API_KEY',
    'SUBSTACK_SID',   // ADD THIS LINE
    'SUBSTACK_LLI'    // ADD THIS LINE
  ]);
}
```

### 6. Document in CLAUDE.md

Add this section to `groups/main/CLAUDE.md` after the Readeck section:

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

Build the host code:

```bash
npm run build
```

Build must be clean before proceeding.

## Phase 3: Deploy

### Build Container

The Substack integration requires rebuilding the container because we added the `cheerio` dependency:

```bash
./container/build.sh
```

### Restart Service

**macOS (launchd):**
```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

**Linux (systemd):**
```bash
systemctl --user restart nanoclaw
```

### Verify Service Running

```bash
# macOS
launchctl list | grep nanoclaw

# Linux
systemctl --user status nanoclaw
```

## Phase 4: Verify

### Test Integration

Tell the user:

> Substack is connected! Send this in your main channel:
>
> `@Sparky list my saved Substack articles` or `@Sparky migrate my Substack articles to Readeck`

### Check Logs if Needed

```bash
tail -f logs/nanoclaw.log
```

Look for successful MCP server initialization and tool calls.

## Troubleshooting

### "SUBSTACK_SID environment variable is required"

Check that the cookie value is in `.env` and the service was restarted after adding it.

### "Authentication failed"

The cookies have expired. Get fresh `substack.sid` and `substack.lli` values from your browser and update `.env`.

### Substack tools not responding

1. Verify you're logged into Substack in your browser
2. Check that the cookies are fresh (they expire periodically)
3. Test manually:
   ```bash
   curl "https://substack.com/api/v1/reader/posts?inboxType=saved&limit=1" \
     -H "Cookie: substack.sid=$SUBSTACK_SID; substack.lli=$SUBSTACK_LLI"
   ```
4. Check container logs: `cat groups/main/logs/container-*.log | tail -50`

### "Substack API error (401)" or "(403)"

Your session cookies are invalid or expired. Get new ones from your browser:
1. Go to https://substack.com (make sure you're logged in)
2. Open Developer Tools → Application → Cookies
3. Copy fresh `substack.sid` and `substack.lli` values
4. Update `.env` and restart the service

### Paid content showing as truncated

If you're subscribed to a newsletter's paid tier but still seeing truncated content:
1. Make sure `SUBSTACK_LLI` is set in `.env`
2. Verify you're actually subscribed to the paid tier for that publication
3. The tool will attempt to fetch full content from the HTML page, but this may not work for all publications

### Container can't access Substack

- Verify `SUBSTACK_SID` and `SUBSTACK_LLI` are in `readSecrets()` in `src/container-runner.ts`
- Check that the container build completed successfully (cheerio dependency must be installed)
- Verify the service restarted after changes
- Ensure network access to https://substack.com from the container

## Removal

To remove Substack integration:

1. Remove `SUBSTACK_SID` and `SUBSTACK_LLI` from `.env`
2. Delete `container/agent-runner/src/substack-mcp-stdio.ts`
3. Remove `"cheerio": "^1.0.0"` from `container/agent-runner/package.json`
4. Remove Substack references from `container/agent-runner/src/index.ts`:
   - Remove `substackMcpPath` variable
   - Remove `substackMcpPath` parameter from `runQuery()` signature
   - Remove `'mcp__substack__*'` from `allowedTools`
   - Remove `substack` MCP server configuration
   - Remove `substackMcpPath` from `runQuery()` call site
5. Remove `'SUBSTACK_SID'` and `'SUBSTACK_LLI'` from `readSecrets()` in `src/container-runner.ts`
6. Remove Substack section from `groups/main/CLAUDE.md`
7. Rebuild and restart:
   ```bash
   cd container/agent-runner && npm install  # Remove cheerio
   npm run build
   ./container/build.sh
   systemctl --user restart nanoclaw  # Linux
   # launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
   ```

## Known Limitations

- **Main channel only** — Substack tools are only available in the main channel for security reasons (same pattern as other integrations)
- **Cookie-based auth** — Requires session cookies that expire periodically. You'll need to refresh them when they expire.
- **No official API** — Uses undocumented Substack internal APIs discovered through browser DevTools. May break if Substack changes their API.
- **Paid content access** — Full content for paid newsletters requires an active subscription and valid `SUBSTACK_LLI` cookie
- **Rate limiting** — Substack may rate-limit excessive API requests
- **No writing/posting** — Read-only access to saved articles. Cannot post or manage subscriptions.

## References

- [jenny-ouyang/substack-article-mcp](https://github.com/jenny-ouyang/substack-article-mcp) - Original MCP implementation this is based on
- [Substack Reader API](https://substack.com/api/v1/reader/posts) - Undocumented endpoint for saved articles
- [Cheerio Documentation](https://cheerio.js.org/) - HTML parsing library used for markdown conversion
