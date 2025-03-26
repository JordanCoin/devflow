import { Command } from 'commander';
import * as logging from '../utils/logging';
import { ConfigManager } from '../config/manager';
import { TaskExecutor } from '../core/executor';
import { ExecutionContext } from '../types';

interface TestOptions {
  config?: string;
  dryRun?: boolean;
  env?: string[];
  debug?: boolean;
}

export const testCommand = new Command('test')
  .description('Run a workflow')
  .argument('<workflow>', 'Name of the workflow to run')
  .option('-c, --config <path>', 'Path to config file')
  .option('-d, --dry-run', 'Show what would be executed without running it')
  .option('-e, --env <key=value...>', 'Environment variables')
  .option('--debug', 'Enable debug logging')
  .action(async (workflow: string, options: TestOptions) => {
    try {
      if (options.debug) {
        logging.setLogLevel('debug');
      }
      
      const configManager = new ConfigManager();
      const config = await configManager.load();
      const executor = new TaskExecutor();

      if (!config.workflows[workflow]) {
        throw new Error(`Workflow "${workflow}" not found`);
      }

      const context: ExecutionContext = {
        env: process.env as Record<string, string>,
        config,
        workflowName: workflow,
        cwd: process.cwd(),
        logger: logging,
        dryRun: options.dryRun
      };

      logging.startSpinner(`Running workflow: ${workflow}`);
      await executor.executeWorkflow(config.workflows[workflow], context);
      logging.stopSpinner(true);
      logging.success(`Workflow ${workflow} completed successfully`);
    } catch (error) {
      logging.stopSpinner(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      logging.error(`Failed to run workflow: ${message}`);
      process.exit(1);
    }
  }); 