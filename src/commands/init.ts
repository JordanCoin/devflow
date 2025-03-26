import { writeFile } from 'fs/promises';
import { join } from 'path';
import { DevFlowError } from '../core/errors';
import { logger } from '../utils/logger';

interface InitOptions {
  type: 'monorepo' | 'single';
}

const defaultConfig = {
  single: {
    project_name: '',
    version: '1.0.0',
    workflows: {
      test: {
        name: 'Integration Tests',
        tasks: []
      }
    }
  },
  monorepo: {
    project_name: '',
    version: '1.0.0',
    packages: [],
    workflows: {
      test: {
        name: 'Integration Tests',
        tasks: []
      }
    }
  }
};

export async function initializeProject(options: InitOptions): Promise<void> {
  try {
    const config = defaultConfig[options.type];
    config.project_name = process.cwd().split('/').pop() || 'devflow-project';

    await writeFile(
      join(process.cwd(), 'devflow.yaml'),
      JSON.stringify(config, null, 2)
    );

    logger.success('Initialized DevFlow project');
    logger.info('Edit devflow.yaml to configure your workflows');
  } catch (error) {
    throw new DevFlowError(
      'Failed to initialize project',
      'INIT_FAILED',
      ['Check file permissions', 'Verify project directory is writable']
    );
  }
} 