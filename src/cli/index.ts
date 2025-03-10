import { Command } from 'commander';
import { initCommand } from './commands/init';
import { testCommand } from './commands/test';
import { logsCommand } from './commands/logs';

export function createCLI(): Command {
  const program = new Command();
  
  program
    .name('devflow')
    .description('CLI Test Environment Automation Tool')
    .version('1.0.0');

  program.addCommand(initCommand);
  program.addCommand(testCommand);
  program.addCommand(logsCommand);

  return program;
} 