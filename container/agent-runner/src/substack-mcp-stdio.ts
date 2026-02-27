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
  $('h1').replaceWith((i, el) => `\n# ${$(el).text()}\n`);
  $('h2').replaceWith((i, el) => `\n## ${$(el).text()}\n`);
  $('h3').replaceWith((i, el) => `\n### ${$(el).text()}\n`);
  $('h4').replaceWith((i, el) => `\n#### ${$(el).text()}\n`);
  $('strong, b').replaceWith((i, el) => `**${$(el).text()}**`);
  $('em, i').replaceWith((i, el) => `*${$(el).text()}*`);
  $('a').replaceWith((i, el) => `[${$(el).text()}](${$(el).attr('href')})`);
  $('code').replaceWith((i, el) => `\`${$(el).text()}\``);
  $('p').replaceWith((i, el) => `\n${$(el).html()}\n`);
  $('br').replaceWith('\n');
  $('hr').replaceWith('\n---\n');

  // Lists
  $('ul').replaceWith((i, el) => {
    const items = $(el).find('li').map((_, li) => `- ${$(li).text()}`).get().join('\n');
    return `\n${items}\n`;
  });
  $('ol').replaceWith((i, el) => {
    const items = $(el).find('li').map((idx, li) => `${idx + 1}. ${$(li).text()}`).get().join('\n');
    return `\n${items}\n`;
  });

  // Blockquotes
  $('blockquote').replaceWith((i, el) => {
    const text = $(el).text().split('\n').map(line => `> ${line}`).join('\n');
    return `\n${text}\n`;
  });

  let text = $.root().text();

  // Clean up excessive whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
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
    pages: z.number().int().min(1).max(10).optional().describe('Number of pages to fetch (each page ~20 items). Default 1.'),
  },
  async (args) => {
    try {
      const pages = args.pages || 1;
      const allItems: SubstackArticle[] = [];
      let cursor: string | null = null;

      for (let page = 0; page < pages; page++) {
        const params = new URLSearchParams({
          inboxType: 'inbox',
          surface: 'inbox_saved',  // Key parameter for saved articles
          limit: '20',
        });
        if (cursor) params.set('cursor', cursor);

        const url = `https://substack.com/api/v1/inbox/top?${params}`;
        const json = await apiRequest(url);

        const postItems = (json.post_items || json.posts || []) as Record<string, unknown>[];
        const pubs = (json.publications || []) as Record<string, unknown>[];

        // Build publication lookup
        const pubMap = new Map<number, Record<string, unknown>>();
        for (const pub of pubs) {
          pubMap.set(pub.id as number, pub);
        }

        for (const item of postItems) {
          const post = (item.post || item) as Record<string, unknown>;
          const pubId = post.publication_id as number;
          let pub = post.publication as Record<string, unknown> | undefined;
          if (!pub) pub = pubMap.get(pubId);

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

        // Get next cursor for pagination
        const nextCursor = json.cursor as string | undefined;
        if (!nextCursor || postItems.length === 0) break;
        cursor = nextCursor;
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
          ].join('\n');
        })
        .join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Saved articles (${allItems.length} total):\n\n${formatted}`,
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
      markdown += `# ${(raw.title as string) || 'Untitled'}${paid}\n\n`;
      if (raw.subtitle) markdown += `*${raw.subtitle as string}*\n\n`;
      if (date) markdown += `Published: ${date}\n`;
      markdown += `URL: ${raw.canonical_url as string}\n`;
      markdown += `By: ${((raw.publishedBylines as Record<string, unknown>[])?.[0]?.name as string) || 'Unknown'}\n`;
      markdown += `Publication: ${args.subdomain}.substack.com\n`;
      if (wordCount) markdown += `Word count: ${wordCount}\n`;
      markdown += '\n---\n\n';

      if (bodyHtml) {
        markdown += htmlToMarkdown(bodyHtml);
      } else if (truncatedBodyText) {
        markdown += truncatedBodyText + '\n\n[Content truncated — you may not be subscribed to this newsletter\'s paid tier]';
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

// Start the stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
