#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { testCommand } from './commands/test';
import { cleanCommand } from './commands/clean';
import { CleanupManager } from './core/cleanup';

// Initialize cleanup manager
CleanupManager.initialize();

const program = new Command();

program
  .name('devflow')
  .description('CLI Test Environment Automation Tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new DevFlow project')
  .action(initCommand);

program.addCommand(testCommand);

program
  .command('clean')
  .description('Clean up all DevFlow managed resources')
  .option('-f, --force', 'Skip confirmation prompt')
  .action((options) => cleanCommand(options));

program.parse(); 