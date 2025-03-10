import { Logger } from '../core/logger';
import { CleanupManager } from '../core/cleanup';

interface CleanOptions {
  force?: boolean;
}

export async function cleanCommand(options: CleanOptions = {}): Promise<void> {
  try {
    if (!options.force) {
      Logger.warn('This will stop and remove all DevFlow managed resources.');
      Logger.warn('Use --force to skip this warning.');
      // In a real CLI we would prompt for confirmation here
    }

    Logger.info('Cleaning up resources...');
    await CleanupManager.triggerCleanup('manual');
    Logger.success('Cleanup completed successfully');
  } catch (error) {
    Logger.error(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
} 