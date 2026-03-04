# Intent: container/agent-runner/src/substack-mcp-stdio.ts

## What this file does

**Full MCP server implementation** for Substack saved articles integration with HTML-to-markdown conversion.

## Why this approach

Substack doesn't have an official API, but their web app uses undocumented internal APIs. This implementation:

1. **Cookie-based authentication**: Uses session cookies (`substack.sid` and `substack.lli`) to authenticate
2. **Saved articles access**: Fetches articles from the user's Substack reading list
3. **Full content extraction**: Gets complete article content, including paid newsletters if subscribed
4. **HTML-to-markdown conversion**: Converts Substack's HTML to clean markdown for readability

## Architecture decisions

### 1. Cookie-Based Authentication

```typescript
function getCookieHeaders(): Record<string, string> {
  return {
    Cookie: `substack.sid=${SUBSTACK_SID}; substack.lli=${SUBSTACK_LLI}`,
    'User-Agent': 'Mozilla/5.0 ...',
  };
}
```

**Why cookies not API keys**: Substack has no official API. The internal APIs used by their web app require session cookies for authentication.

**Two cookies**:
- `substack.sid` (required): Session identifier, expires periodically
- `substack.lli` (optional): Login identifier, improves paid content access

**User-Agent header**: Required to avoid bot detection. Mimics a real browser.

### 2. Dual Fetch Strategy for Paid Content

```typescript
// First try API endpoint
const raw = await apiRequest(url);
let bodyHtml = raw.body_html || '';

// If truncated (common for paid articles), fetch from HTML page
if (isPaid && likelyTruncated) {
  const fromPage = await fetchArticleBodyFromPage(slug, subdomain);
  if (fromPage.length > bodyHtml.length) bodyHtml = fromPage;
}
```

**Why two fetches?**: The API endpoint often returns truncated content for paid newsletters. Fetching the actual HTML page (while authenticated) gets the full content.

**Truncation detection**:
- Check if `truncated_body_text` is present
- Compare word count to HTML length
- If ratio suggests truncation, fetch from page

**Trade-off**: Slower (two network requests) but ensures full content access for paid subscriptions.

### 3. Three Tools (Minimal but Complete)

| Tool | Purpose |
|------|---------|
| `substack_get_saved_articles` | List articles from reading list |
| `substack_get_article` | Get full content as markdown |
| `substack_remove_saved_article` | Remove from reading list |

**Why only 3 tools?**: This integration is designed for a specific workflow: **migrate saved articles from Substack to Readeck**.

1. List saved articles
2. For each article, get full content
3. Save to Readeck
4. Remove from Substack list

More tools (like "subscribe", "post comment", "manage subscriptions") aren't needed for this use case.

### 4. HTML-to-Markdown Conversion with Cheerio

```typescript
function htmlToMarkdown(html: string): string {
  const $ = load(html);

  // Remove scripts/styles
  $('script, style').remove();

  // Convert elements
  $('h1').replaceWith((_i, el) => `\n# ${$(el).text()}\n`);
  $('strong, b').replaceWith((_i, el) => `**${$(el).text()}**`);
  $('a').replaceWith((_i, el) => `[${$(el).text()}](${$(el).attr('href')})`);
  // ... more conversions
}
```

**Why not use a library?**: Libraries like `turndown` add significant bundle size. Substack articles use a limited set of HTML elements, so a custom converter is simpler and lighter.

**Elements handled**:
- Headings (h1-h4)
- Bold/italic text
- Links
- Lists (ordered and unordered)
- Blockquotes
- Code blocks
- Horizontal rules

**What's NOT handled**: Complex tables, nested formatting, custom HTML/CSS. These are rare in Substack articles.

### 5. Saved Articles API Parsing

```typescript
const posts = (json.posts || []) as Record<string, unknown>[];
const pubs = (json.publications || []) as Record<string, unknown>[];

// Build publication lookup
const pubMap = new Map<number, Record<string, unknown>>();
for (const pub of pubs) {
  pubMap.set(pub.id as number, pub);
}
```

**Why join posts and publications?**: The API returns them separately. Posts reference publications by ID, so we build a lookup map to join them.

**Data structure**: The API returns untyped JSON. We use `Record<string, unknown>` and cast to specific types as needed, rather than define interfaces for every nested object (which would be brittle to API changes).

### 6. Environment Variables

- `SUBSTACK_SID` (required): Session cookie
- `SUBSTACK_LLI` (optional, defaults to "1"): Login identifier

**Default for SUBSTACK_LLI**: If not provided, we default to "1" which is better than undefined (some APIs check for presence, not specific value).

## Error handling

**Authentication failures (401/403)**: Throw clear error message asking user to check cookies.

**Network errors**: Propagate to caller (Agent SDK), which will show to user.

**Missing content**: Return empty or truncated content with explanation, don't fail the entire request.

**Graceful degradation**: If HTML page fetch fails, fall back to API content (even if truncated).

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol
- `zod` - Parameter validation
- `cheerio` - HTML parsing for markdown conversion

**Why cheerio?**: Lightweight, jQuery-like API, perfect for HTML parsing. Alternative would be `jsdom` (much heavier) or `turndown` (less control).

**Package.json change required**: Unlike other integrations, this adds a new dependency, so `container/build.sh` is required (not just `update-agent-source.sh`).

## Known API quirks

### 1. Pagination
The saved articles API supports pagination via `beforeAt` parameter, but we don't implement it. Current approach: User specifies `limit` (default 20, max 100). For most users, 100 articles is sufficient.

**Future improvement**: Could add pagination support if users have >100 saved articles.

### 2. Publication metadata
Some fields (like `author_name`) appear in different places depending on API version:
- Sometimes in post object: `post.publishedBylines[0].name`
- Sometimes in publication object: `pub.author_name`

We check both and fall back gracefully.

### 3. Word count reliability
The `wordcount` field is sometimes inaccurate or missing. We use it for truncation detection but don't rely on it exclusively.

## Security considerations

**Cookie storage**: Cookies are stored in `.env` file (same as other credentials). They're passed to the container but never logged.

**Cookie expiration**: Session cookies expire periodically. User will need to refresh them manually (documented in troubleshooting).

**Read-only access**: This integration only reads data and removes from saved list. It cannot post, comment, or modify subscriptions. Low risk.

## Testing approach

**No unit tests**: Same rationale as other integrations - thin API wrapper, hard to mock Substack APIs.

**Manual integration testing**: Test via agent queries:
1. "List my saved Substack articles"
2. "Get the content of <article>"
3. "Migrate my Substack articles to Readeck"

## Future improvements (not implemented)

- **Pagination support**: For users with >100 saved articles
- **Search**: Substack has search APIs but not used here
- **Subscriptions management**: List/manage subscriptions (out of scope for current workflow)
- **Better markdown conversion**: Handle tables, nested formatting (rare in practice)
- **Automatic cookie refresh**: Would require headless browser (too complex)

None of these were needed for the core use case: migrating saved articles to Readeck.

## Comparison to jenny-ouyang/substack-article-mcp

This implementation is based on [jenny-ouyang/substack-article-mcp](https://github.com/jenny-ouyang/substack-article-mcp) but adapted for NanoClaw:

**Kept**:
- Cookie-based authentication approach
- API endpoints and request structure
- HTML-to-markdown conversion logic

**Changed**:
- Removed pagination (simplified to single-page fetch with limit)
- Removed some error handling complexity (let Agent SDK handle it)
- Adapted to NanoClaw's MCP server pattern (same as other integrations)
- Added dual-fetch strategy for paid content

**Why fork instead of use directly?**: NanoClaw needs tight integration with the rest of the stack (environment variables, error handling, tool naming conventions). Forking and simplifying was cleaner than wrapping.
