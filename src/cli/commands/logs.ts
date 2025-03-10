import { Command } from 'commander';
import { Logger } from '../../core/logger';
import { logsCommand as logsCommandImpl } from '../../commands/logs';
import { LogOptions } from '../../types/docker';

export const logsCommand = new Command('logs')
  .description('Stream logs from a container')
  .argument('<container>', 'Name or ID of the container')
  .option('-f, --follow', 'Follow log output')
  .option('-t, --timestamps', 'Show timestamps')
  .option('--tail <number>', 'Number of lines to show from the end')
  .option('--filter <pattern>', 'Filter logs by pattern')
  .action(async (container: string, options: LogOptions) => {
    try {
      await logsCommandImpl(container, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to stream logs: ${message}`);
      process.exit(1);
    }
  }); 