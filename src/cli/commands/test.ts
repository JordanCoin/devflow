import { Command } from 'commander';
import { Logger } from '../../core/logger';
import { ConfigManager } from '../../config/manager';
import { TaskExecutor } from '../../core/executor';
import { ExecutionContext } from '../../types';

export const testCommand = new Command('test')
  .description('Run a workflow')
  .argument('<workflow>', 'Name of the workflow to run')
  .action(async (workflow: string) => {
    try {
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
        logger: Logger,
        dryRun: false
      };

      await executor.executeWorkflow(config.workflows[workflow], context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to run workflow: ${message}`);
      process.exit(1);
    }
  }); 