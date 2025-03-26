import { DevFlowError } from './errors';
import { logger } from '../utils/logger';

export async function validateEnvironment(): Promise<void> {
  try {
    // Check Node.js version
    const nodeVersion = process.version.slice(1).split('.').map(Number);
    if (nodeVersion[0] < 14) {
      throw new DevFlowError(
        'Node.js version 14 or higher is required',
        'ENV_NODE_VERSION',
        ['Upgrade Node.js to version 14 or higher']
      );
    }

    // Check for required environment variables
    const requiredEnvVars = ['HOME', 'PATH'];
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingEnvVars.length > 0) {
      throw new DevFlowError(
        `Missing required environment variables: ${missingEnvVars.join(', ')}`,
        'ENV_MISSING_VARS',
        ['Ensure all required environment variables are set']
      );
    }

    // Check for Docker if needed
    try {
      const { execSync } = require('child_process');
      execSync('docker --version', { stdio: 'ignore' });
    } catch (error) {
      logger.warning('Docker is not installed. Some features may be limited.');
    }

    logger.debug('Environment validation completed successfully');
  } catch (error) {
    if (error instanceof DevFlowError) {
      throw error;
    }
    throw new DevFlowError(
      'Failed to validate environment',
      'ENV_VALIDATION_FAILED',
      ['Check system requirements', 'Verify environment setup']
    );
  }
} 