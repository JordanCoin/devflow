import { Command } from 'commander';
import { Logger } from '../../core/logger';
import { ConfigManager } from '../../config/manager';
import { TemplateManager } from '../../config/template';
import { prompt } from 'inquirer';
import { join } from 'path';
import { DevFlowConfig } from '../../types/config';

type TemplateKey = 'react-node-postgres' | 'react-node-postgres-test' | 'node-ci-pipeline' | 'node-microservices-dev' | 'microservices';

interface Template {
  name: string;
  description: string;
  file: string;
}

const TEMPLATES: Record<TemplateKey, Template> = {
  'react-node-postgres': {
    name: 'React + Node + Postgres',
    description: 'Full-stack development environment with React frontend, Node.js backend, and PostgreSQL database',
    file: 'react-node-postgres.yaml'
  },
  'react-node-postgres-test': {
    name: 'React + Node + Postgres Tests',
    description: 'Comprehensive test environment for React + Node + Postgres applications',
    file: 'react-node-postgres-test.yaml'
  },
  'node-ci-pipeline': {
    name: 'Node.js CI Pipeline',
    description: 'Production CI/CD pipeline simulation for Node.js applications',
    file: 'node-ci-pipeline.yaml'
  },
  'node-microservices-dev': {
    name: 'Node.js Microservices Development',
    description: 'Complete development environment for Node.js microservices architecture',
    file: 'node-microservices-dev.yaml'
  },
  'microservices': {
    name: 'Microservices',
    description: 'Basic microservices setup with service discovery and API gateway',
    file: 'microservices.yaml'
  }
};

export const initCommand = new Command('init')
  .description('Initialize a new DevFlow project')
  .option('-f, --force', 'Force overwrite of existing configuration')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const templateManager = new TemplateManager();

      // Check if config already exists
      if (configManager.exists() && !options.force) {
        Logger.warn('DevFlow configuration already exists. Use --force to overwrite.');
        return;
      }

      // Get project details
      const answers = await prompt<{ projectName: string; template: TemplateKey }>([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project name?',
          default: 'my-project'
        },
        {
          type: 'list',
          name: 'template',
          message: 'Select a template:',
          choices: Object.entries(TEMPLATES).map(([key, value]) => ({
            name: `${value.name}\n  ${value.description}`,
            value: key
          }))
        }
      ]);

      // Load and customize template
      const template = await templateManager.loadTemplate(
        join('workflows', TEMPLATES[answers.template].file)
      );

      // Update project name
      template.project_name = answers.projectName;

      // Save configuration
      await configManager.save(template);

      Logger.success('DevFlow configuration created successfully!');
      Logger.info('\nNext steps:');
      Logger.info('1. Review the generated devflow.yaml file');
      Logger.info('2. Customize the configuration as needed');
      Logger.info('3. Run your first workflow with: devflow test <workflow-name>');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to initialize DevFlow project: ${message}`);
      process.exit(1);
    }
  }); 