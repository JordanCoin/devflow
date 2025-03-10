import { writeFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { Logger } from '../core/logger';

export async function initCommand(): Promise<void> {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'project_name',
        message: 'What is your project name?',
        validate: (input: string) => input.length > 0 || 'Project name is required'
      },
      {
        type: 'input',
        name: 'workflow_name',
        message: 'Name of your first workflow?',
        default: 'test'
      }
    ]);

    const config = {
      project_name: answers.project_name,
      version: '1.0.0',
      workflows: {
        [answers.workflow_name]: {
          name: answers.workflow_name,
          description: 'Default workflow',
          tasks: [
            {
              name: 'Example Task',
              type: 'command',
              command: 'echo "Hello from DevFlow!"'
            }
          ]
        }
      }
    };

    const configPath = join(process.cwd(), 'devflow.yaml');
    writeFileSync(configPath, generateYaml(config));

    Logger.success('Created DevFlow configuration');
    Logger.info(`Edit ${configPath} to customize your workflows`);
  } catch (error) {
    Logger.error(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function generateYaml(config: any): string {
  return `# DevFlow Configuration
project_name: ${config.project_name}
version: ${config.version}

workflows:
  ${config.workflows[Object.keys(config.workflows)[0]].name}:
    name: ${config.workflows[Object.keys(config.workflows)[0]].name}
    description: ${config.workflows[Object.keys(config.workflows)[0]].description}
    tasks:
      - name: ${config.workflows[Object.keys(config.workflows)[0]].tasks[0].name}
        type: ${config.workflows[Object.keys(config.workflows)[0]].tasks[0].type}
        command: ${config.workflows[Object.keys(config.workflows)[0]].tasks[0].command}
`;
} 