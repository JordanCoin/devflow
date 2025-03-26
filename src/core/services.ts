import { readFile } from 'fs/promises';
import { join } from 'path';
import { DevFlowError } from './errors';
import { logger } from '../utils/logger';

interface DetectedService {
  type: string;
  name: string;
  version?: string;
  config?: Record<string, unknown>;
}

export async function detectServices(): Promise<DetectedService[]> {
  try {
    const services: DetectedService[] = [];
    const cwd = process.cwd();

    // Check for package.json
    try {
      const packageJson = JSON.parse(
        await readFile(join(cwd, 'package.json'), 'utf-8')
      );
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for common services in dependencies
      if (deps['pg'] || deps['postgres']) {
        services.push({ type: 'database', name: 'PostgreSQL' });
      }
      if (deps['redis']) {
        services.push({ type: 'cache', name: 'Redis' });
      }
      if (deps['mongodb']) {
        services.push({ type: 'database', name: 'MongoDB' });
      }
    } catch (error) {
      logger.debug('No package.json found or unable to parse');
    }

    // Check for docker-compose.yml
    try {
      const dockerCompose = await readFile(
        join(cwd, 'docker-compose.yml'),
        'utf-8'
      );
      if (dockerCompose) {
        services.push({ type: 'container', name: 'Docker Compose' });
      }
    } catch (error) {
      logger.debug('No docker-compose.yml found');
    }

    if (services.length === 0) {
      logger.info('No services detected in the current project');
    } else {
      logger.success(
        `Detected ${services.length} service(s):\n${services
          .map(s => `- ${s.name} (${s.type})`)
          .join('\n')}`
      );
    }

    return services;
  } catch (error) {
    throw new DevFlowError(
      'Failed to detect services',
      'SERVICE_DETECTION_FAILED',
      ['Check file permissions', 'Verify project structure']
    );
  }
} 