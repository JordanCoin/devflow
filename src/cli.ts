#!/usr/bin/env node
import { Command } from 'commander';
import { DevFlowError } from './core/errors';
import { logger } from './utils/logger';
import { validateEnvironment } from './core/environment';
import { detectServices } from './core/services';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import commands
import { initializeProject } from './commands/init';
import { runWorkflow } from './commands/workflow';
import { cleanupResources } from './commands/cleanup';

interface PackageJson {
  version: string;
}

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
) as PackageJson;

const program = new Command();

async function main() {
  try {
    await validateEnvironment();
    
    program
      .name('devflow')
      .description('CLI Test Environment Automation Tool')
      .version(packageJson.version);

    program
      .command('init')
      .description('Initialize a new DevFlow project')
      .option('-t, --type <type>', 'Project type (monorepo/single)', 'single')
      .action(async (options: { type: 'monorepo' | 'single' }) => {
        await initializeProject(options);
      });

    program
      .command('test <workflow>')
      .description('Run a workflow')
      .option('-e, --env <environment>', 'Environment to use', 'development')
      .option('-p, --parallel', 'Run tasks in parallel', false)
      .action(async (workflow: string, options: { env: string; parallel: boolean }) => {
        await runWorkflow(workflow, options);
      });

    program
      .command('clean')
      .description('Clean up all resources')
      .action(async () => {
        await cleanupResources();
      });

    program
      .command('detect')
      .description('Detect services in project')
      .action(async () => {
        await detectServices();
      });

    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof DevFlowError) {
      logger.error(`Error: ${error.message}`);
      if (error.suggestions.length > 0) {
        logger.info('\nSuggestions:');
        error.suggestions.forEach((suggestion: string) => logger.info(`- ${suggestion}`));
      }
      process.exit(1);
    }
    if (error instanceof Error) {
      logger.error('An unexpected error occurred:', error.message);
    } else {
      logger.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main(); 