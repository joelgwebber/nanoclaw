import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { DATA_DIR } from './config.js';
import { logger } from './logger.js';

const YAK_SCRIPT_PATH = path.join(
  process.env.HOME || '',
  '.claude/plugins/cache/yaks-marketplace/yaks/0.1.1/scripts/yak.py',
);

/**
 * Write a response file to the group's IPC responses directory
 */
function writeYakResponse(
  sourceGroup: string,
  responseType: string,
  data: object,
): void {
  const responseFile = path.join(
    DATA_DIR,
    'ipc',
    sourceGroup,
    'responses',
    `${responseType}_${Date.now()}.json`,
  );
  fs.mkdirSync(path.dirname(responseFile), { recursive: true });
  fs.writeFileSync(responseFile, JSON.stringify(data, null, 2));
}

/**
 * Execute a yak.py command and return the output
 */
function execYak(args: string[]): string {
  const escapedArgs = args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ');
  return execSync(`python3 "${YAK_SCRIPT_PATH}" ${escapedArgs}`, {
    encoding: 'utf-8',
  });
}

export interface YakIpcData {
  type: string;
  // create_yak
  title?: string;
  yak_type?: string;
  priority?: number;
  description?: string;
  parent?: string;
  // list_yaks
  status?: string;
  // show_yak, shave_yak, shorn_yak, regrow_yak
  yak_id?: string;
  // update_yak
  new_title?: string;
  new_type?: string;
  new_priority?: number;
  new_description?: string;
  // dep_yak
  dep_action?: 'add' | 'remove';
  dep_id?: string;
}

export async function handleYakIpc(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  switch (data.type) {
    case 'create_yak':
      await handleCreateYak(data, sourceGroup, isMain);
      break;

    case 'list_yaks':
      await handleListYaks(data, sourceGroup);
      break;

    case 'show_yak':
      await handleShowYak(data, sourceGroup);
      break;

    case 'update_yak':
      await handleUpdateYak(data, sourceGroup, isMain);
      break;

    case 'shave_yak':
      await handleShaveYak(data, sourceGroup, isMain);
      break;

    case 'shorn_yak':
      await handleShornYak(data, sourceGroup, isMain);
      break;

    case 'regrow_yak':
      await handleRegrowYak(data, sourceGroup, isMain);
      break;

    case 'dep_yak':
      await handleDepYak(data, sourceGroup, isMain);
      break;

    default:
      logger.warn({ type: data.type }, 'Unknown yak IPC type');
  }
}

async function handleCreateYak(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  // Only main group can create yaks
  if (!isMain) {
    logger.warn({ sourceGroup }, 'Unauthorized create_yak attempt blocked');
    return;
  }

  if (!data.title || !data.yak_type || !data.priority || !data.description) {
    logger.warn(
      { data },
      'Invalid create_yak request - missing required fields (title, yak_type, priority, description)',
    );
    return;
  }

  try {
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

    const result = execYak(args);

    logger.info(
      { sourceGroup, title: data.title, result: result.trim() },
      'Yak created via IPC',
    );

    // Result format: "Created nanoclaw-xxxx: Title"
    const yakIdMatch = result.match(/Created (nanoclaw-[a-f0-9]+):/);
    if (yakIdMatch) {
      writeYakResponse(sourceGroup, 'yak', {
        success: true,
        yak_id: yakIdMatch[1],
        title: data.title,
        type: data.yak_type,
        priority: data.priority,
        created: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error(
      { err, sourceGroup, title: data.title },
      'Error creating yak via IPC',
    );

    writeYakResponse(sourceGroup, 'yak', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      title: data.title,
    });
  }
}

async function handleListYaks(
  data: YakIpcData,
  sourceGroup: string,
): Promise<void> {
  try {
    const args = ['list', '--json'];

    // Filter by status if provided
    if (data.status && data.status !== 'all') {
      args.push('--status', data.status);
    }

    const result = execYak(args);

    writeYakResponse(sourceGroup, 'list_yaks', JSON.parse(result));

    logger.info({ sourceGroup, status: data.status }, 'Yaks listed via IPC');
  } catch (err) {
    logger.error({ err, sourceGroup }, 'Error listing yaks via IPC');
  }
}

async function handleShowYak(
  data: YakIpcData,
  sourceGroup: string,
): Promise<void> {
  if (!data.yak_id) {
    logger.warn({ data }, 'Invalid show_yak request - missing yak_id');
    return;
  }

  try {
    const result = execYak(['show', '--json', data.yak_id]);

    writeYakResponse(sourceGroup, 'show_yak', JSON.parse(result));

    logger.info({ sourceGroup, yakId: data.yak_id }, 'Yak shown via IPC');
  } catch (err) {
    logger.error({ err, sourceGroup, yakId: data.yak_id }, 'Error showing yak via IPC');

    writeYakResponse(sourceGroup, 'show_yak', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      yak_id: data.yak_id,
    });
  }
}

async function handleUpdateYak(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  // Only main group can update yaks
  if (!isMain) {
    logger.warn({ sourceGroup }, 'Unauthorized update_yak attempt blocked');
    return;
  }

  if (!data.yak_id) {
    logger.warn({ data }, 'Invalid update_yak request - missing yak_id');
    return;
  }

  try {
    const args = ['update', data.yak_id];

    if (data.new_title) {
      args.push('--title', data.new_title);
    }
    if (data.new_type) {
      args.push('--type', data.new_type);
    }
    if (data.new_priority !== undefined) {
      args.push('--priority', data.new_priority.toString());
    }
    if (data.new_description) {
      args.push('--description', data.new_description);
    }

    const result = execYak(args);

    logger.info(
      { sourceGroup, yakId: data.yak_id },
      'Yak updated via IPC',
    );

    writeYakResponse(sourceGroup, 'update_yak', {
      success: true,
      yak_id: data.yak_id,
      updated: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(
      { err, sourceGroup, yakId: data.yak_id },
      'Error updating yak via IPC',
    );

    writeYakResponse(sourceGroup, 'update_yak', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      yak_id: data.yak_id,
    });
  }
}

async function handleShaveYak(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  // Only main group can shave yaks
  if (!isMain) {
    logger.warn({ sourceGroup }, 'Unauthorized shave_yak attempt blocked');
    return;
  }

  if (!data.yak_id) {
    logger.warn({ data }, 'Invalid shave_yak request - missing yak_id');
    return;
  }

  try {
    execYak(['shave', data.yak_id]);

    logger.info({ sourceGroup, yakId: data.yak_id }, 'Yak shaved via IPC');

    writeYakResponse(sourceGroup, 'shave_yak', {
      success: true,
      yak_id: data.yak_id,
      status: 'shearing',
    });
  } catch (err) {
    logger.error(
      { err, sourceGroup, yakId: data.yak_id },
      'Error shaving yak via IPC',
    );

    writeYakResponse(sourceGroup, 'shave_yak', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      yak_id: data.yak_id,
    });
  }
}

async function handleShornYak(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  // Only main group can mark yaks as shorn
  if (!isMain) {
    logger.warn({ sourceGroup }, 'Unauthorized shorn_yak attempt blocked');
    return;
  }

  if (!data.yak_id) {
    logger.warn({ data }, 'Invalid shorn_yak request - missing yak_id');
    return;
  }

  try {
    execYak(['shorn', data.yak_id]);

    logger.info({ sourceGroup, yakId: data.yak_id }, 'Yak marked as shorn via IPC');

    writeYakResponse(sourceGroup, 'shorn_yak', {
      success: true,
      yak_id: data.yak_id,
      status: 'shorn',
    });
  } catch (err) {
    logger.error(
      { err, sourceGroup, yakId: data.yak_id },
      'Error marking yak as shorn via IPC',
    );

    writeYakResponse(sourceGroup, 'shorn_yak', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      yak_id: data.yak_id,
    });
  }
}

async function handleRegrowYak(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  // Only main group can regrow yaks
  if (!isMain) {
    logger.warn({ sourceGroup }, 'Unauthorized regrow_yak attempt blocked');
    return;
  }

  if (!data.yak_id) {
    logger.warn({ data }, 'Invalid regrow_yak request - missing yak_id');
    return;
  }

  try {
    execYak(['regrow', data.yak_id]);

    logger.info({ sourceGroup, yakId: data.yak_id }, 'Yak regrown via IPC');

    writeYakResponse(sourceGroup, 'regrow_yak', {
      success: true,
      yak_id: data.yak_id,
      status: 'hairy',
    });
  } catch (err) {
    logger.error(
      { err, sourceGroup, yakId: data.yak_id },
      'Error regrowing yak via IPC',
    );

    writeYakResponse(sourceGroup, 'regrow_yak', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      yak_id: data.yak_id,
    });
  }
}

async function handleDepYak(
  data: YakIpcData,
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  // Only main group can manage yak dependencies
  if (!isMain) {
    logger.warn({ sourceGroup }, 'Unauthorized dep_yak attempt blocked');
    return;
  }

  if (!data.yak_id || !data.dep_action || !data.dep_id) {
    logger.warn(
      { data },
      'Invalid dep_yak request - missing yak_id, dep_action, or dep_id',
    );
    return;
  }

  try {
    execYak(['dep', data.dep_action, data.yak_id, data.dep_id]);

    logger.info(
      { sourceGroup, yakId: data.yak_id, depId: data.dep_id, action: data.dep_action },
      'Yak dependency managed via IPC',
    );

    writeYakResponse(sourceGroup, 'dep_yak', {
      success: true,
      yak_id: data.yak_id,
      dep_id: data.dep_id,
      action: data.dep_action,
    });
  } catch (err) {
    logger.error(
      { err, sourceGroup, yakId: data.yak_id, depId: data.dep_id },
      'Error managing yak dependency via IPC',
    );

    writeYakResponse(sourceGroup, 'dep_yak', {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      yak_id: data.yak_id,
      dep_id: data.dep_id,
    });
  }
}
