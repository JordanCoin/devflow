import { Command } from 'commander';
import * as logging from '../../utils/logging';
import { ConfigManager } from '../../config/manager';
import { TaskExecutor } from '../../core/executor';
import { ExecutionContext } from '../../types';

export const testCommand = new Command('test')
  .description('Run a workflow')
  .argument('<workflow>', 'Name of the workflow to run')
  .option('--debug', 'Enable debug output')
  .action(async (workflow: string, options: { debug?: boolean }) => {
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
        dryRun: false
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