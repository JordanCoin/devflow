import * as logging from '../utils/logging';
import { CleanupManager } from '../core/cleanup';

interface CleanOptions {
  force?: boolean;
}

export async function cleanCommand(options: CleanOptions = {}): Promise<void> {
  try {
    if (!options.force) {
      logging.warn('This will stop and remove all DevFlow managed resources.');
      logging.warn('Use --force to skip this warning.');
      // In a real CLI we would prompt for confirmation here
    }

    logging.startSpinner('Cleaning up resources...');
    await CleanupManager.triggerCleanup('manual');
    logging.stopSpinner(true);
    logging.success('Cleanup completed successfully');
  } catch (error) {
    if (options.force) {
      logging.stopSpinner(false);
    }
    logging.error(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
} 