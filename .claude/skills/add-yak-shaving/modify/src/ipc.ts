// This file shows the modifications needed for add-yak-shaving skill
// MODIFICATIONS ONLY - not the complete file

// ========== MODIFICATION 1: Update processTaskIpc interface ==========
// Location: Around line 155-182
// Add these fields to the data parameter:

export async function processTaskIpc(
  data: {
    type: string;
    // ... existing fields ...
    // For create_yak
    title?: string;
    yak_type?: string;
    priority?: number;
    description?: string;
    parent?: string;
    // For list_yaks
    status?: string; // 'hairy' | 'shearing' | 'shorn' | 'all'
  },
  sourceGroup: string,
  isMain: boolean,
  deps: IpcDeps,
): Promise<void> {
  // ... existing code ...
}

// ========== MODIFICATION 2: Add create_yak handler with response file ==========
// Location: After register_group case (around line 393), before default case
// Add this complete case:

    case 'create_yak':
      // Only main group can create yaks
      if (!isMain) {
        logger.warn(
          { sourceGroup },
          'Unauthorized create_yak attempt blocked',
        );
        break;
      }
      if (data.title && data.yak_type && data.priority && data.description) {
        try {
          const { execSync } = await import('child_process');
          const args = [
            'create',
            '--title',
            data.title,
            '--type',
            data.yak_type,
            '--priority',
            data.priority.toString(),
            '--description',
            data.description,
          ];
          if (data.parent) {
            args.push('--parent', data.parent);
          }

          const yakScript = path.join(
            process.env.HOME || '',
            '.claude/plugins/cache/yaks-marketplace/yaks/0.1.1/scripts/yak.py',
          );

          const result = execSync(
            `python3 "${yakScript}" ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`,
            { encoding: 'utf-8' },
          );

          logger.info(
            { sourceGroup, title: data.title, result: result.trim() },
            'Yak created via IPC',
          );

          // Write response file with yak ID for agent feedback
          // Result format: "Created nanoclaw-xxxx: Title"
          const yakIdMatch = result.match(/Created (nanoclaw-[a-f0-9]+):/);
          if (yakIdMatch) {
            const responseFile = path.join(
              DATA_DIR,
              'ipc',
              sourceGroup,
              'responses',
              `yak_${Date.now()}.json`,
            );
            fs.mkdirSync(path.dirname(responseFile), { recursive: true });
            fs.writeFileSync(
              responseFile,
              JSON.stringify(
                {
                  success: true,
                  yak_id: yakIdMatch[1],
                  title: data.title,
                  type: data.yak_type,
                  priority: data.priority,
                  created: new Date().toISOString(),
                },
                null,
                2,
              ),
            );
          }
        } catch (err) {
          logger.error(
            { err, sourceGroup, title: data.title },
            'Error creating yak via IPC',
          );

          // Write error response file
          const responseFile = path.join(
            DATA_DIR,
            'ipc',
            sourceGroup,
            'responses',
            `yak_${Date.now()}.json`,
          );
          fs.mkdirSync(path.dirname(responseFile), { recursive: true });
          fs.writeFileSync(
            responseFile,
            JSON.stringify(
              {
                success: false,
                error: err instanceof Error ? err.message : String(err),
                title: data.title,
              },
              null,
              2,
            ),
          );
        }
      } else {
        logger.warn(
          { data },
          'Invalid create_yak request - missing required fields (title, yak_type, priority, description)',
        );
      }
      break;

// ========== MODIFICATION 3: Add list_yaks handler ==========
// Location: After create_yak case, before default case
// Add this complete case:

    case 'list_yaks':
      try {
        const { execSync } = await import('child_process');
        const yakScript = path.join(
          process.env.HOME || '',
          '.claude/plugins/cache/yaks-marketplace/yaks/0.1.1/scripts/yak.py',
        );

        const args = ['list', '--json'];

        // Filter by status if provided
        if (data.status && data.status !== 'all') {
          args.push('--status', data.status);
        }

        // Note: Keyword search not directly supported by yak.py list command
        // Agent can filter results client-side if needed

        const result = execSync(
          `python3 "${yakScript}" ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`,
          { encoding: 'utf-8' },
        );

        const responseFile = path.join(
          DATA_DIR,
          'ipc',
          sourceGroup,
          'responses',
          `list_yaks_${Date.now()}.json`,
        );
        fs.mkdirSync(path.dirname(responseFile), { recursive: true });
        fs.writeFileSync(responseFile, result);

        logger.info(
          { sourceGroup, status: data.status },
          'Yaks listed via IPC',
        );
      } catch (err) {
        logger.error({ err, sourceGroup }, 'Error listing yaks via IPC');
      }
      break;
