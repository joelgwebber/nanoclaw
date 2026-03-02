/**
 * Yak MCP Tools - Reference Implementation
 *
 * This file shows the additions to container/agent-runner/src/ipc-mcp-stdio.ts
 * for yak-shaving capability. Not a complete file - apply these changes to existing code.
 */

// 1. ADD RESPONSES_DIR CONSTANT (after TASKS_DIR)
const RESPONSES_DIR = path.join(IPC_DIR, 'responses');

// 2. ADD RESPONSE POLLING HELPER (after writeIpcFile function)
/**
 * Wait for a response file matching the pattern, created after requestTime.
 * Polls every 100ms until timeout.
 */
async function waitForResponse(
  requestTime: number,
  pattern: RegExp,
  timeoutMs = 2000,
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(RESPONSES_DIR)) {
      const files = fs.readdirSync(RESPONSES_DIR).filter((f) => pattern.test(f));

      for (const file of files) {
        // Extract timestamp from filename (format: prefix_TIMESTAMP.json)
        const match = file.match(/_(\d+)\.json$/);
        if (match) {
          const fileTime = parseInt(match[1], 10);
          // File was created after our request (with small buffer for clock skew)
          if (fileTime >= requestTime - 100) {
            const filepath = path.join(RESPONSES_DIR, file);
            const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

            // Clean up response file
            try {
              fs.unlinkSync(filepath);
            } catch {
              // Ignore cleanup errors
            }

            return content;
          }
        }
      }
    }

    // Poll every 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    'Response timeout - no response file received within 2 seconds',
  );
}

// 3. ADD CREATE_YAK MCP TOOL (after register_group tool, before stdio transport)
server.tool(
  'create_yak',
  'Create a new yak (task) to track NanoClaw improvements or issues. Main group only. Returns the yak ID upon success.',
  {
    title: z.string().describe('Concise title for the yak'),
    yak_type: z
      .enum(['bug', 'feature', 'task'])
      .describe('Type of yak: bug, feature, or task'),
    priority: z
      .number()
      .int()
      .min(1)
      .max(3)
      .describe('Priority: 1=critical, 2=important, 3=nice-to-have'),
    description: z
      .string()
      .describe('Full description including implementation notes'),
    parent: z
      .string()
      .optional()
      .describe(
        'Parent yak ID (e.g., "nanoclaw-xxxx") to create a child yak',
      ),
  },
  async (args) => {
    if (!isMain) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Only the main group can create yaks.',
          },
        ],
        isError: true,
      };
    }

    const requestTime = Date.now();
    const data = {
      type: 'create_yak',
      title: args.title,
      yak_type: args.yak_type,
      priority: args.priority,
      description: args.description,
      parent: args.parent,
      timestamp: new Date().toISOString(),
    };

    writeIpcFile(TASKS_DIR, data);

    try {
      // Wait for response from controller
      const response = await waitForResponse(requestTime, /^yak_\d+\.json$/);

      if (response.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Yak created: ${response.yak_id} - "${response.title}"`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to create yak: ${response.error}`,
            },
          ],
          isError: true,
        };
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error creating yak: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// 4. ADD LIST_YAKS MCP TOOL (after create_yak tool)
server.tool(
  'list_yaks',
  'List yaks filtered by status. Returns an array of yak objects with id, title, type, priority, status, and timestamps.',
  {
    status: z
      .enum(['hairy', 'shearing', 'shorn', 'all'])
      .default('hairy')
      .describe(
        'Filter by status: hairy=not started, shearing=in progress, shorn=completed, all=everything',
      ),
  },
  async (args) => {
    const requestTime = Date.now();
    const data = {
      type: 'list_yaks',
      status: args.status,
      timestamp: new Date().toISOString(),
    };

    writeIpcFile(TASKS_DIR, data);

    try {
      // Wait for response from controller
      const yaks = await waitForResponse(
        requestTime,
        /^list_yaks_\d+\.json$/,
      );

      if (Array.isArray(yaks) && yaks.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No ${args.status === 'all' ? '' : args.status + ' '}yaks found.`,
            },
          ],
        };
      }

      // Return formatted list
      const formatted = yaks
        .map(
          (y: any) =>
            `- [${y.id}] ${y.title} (${y.type}, p${y.priority}) - ${y.status}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Yaks (${args.status}):\n${formatted}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error listing yaks: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);
