import inquirer from 'inquirer';
import { Logger } from '../core/logger';
import { DevFlowConfig, TaskType, Workflow, Task } from '../types';
import { writeFileSync } from 'fs';

export async function initCommand(): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'project_name',
      message: 'What is your project name?',
      default: 'my-project'
    },
    {
      type: 'input',
      name: 'workflow_name',
      message: 'What would you like to name your first workflow?',
      default: 'test'
    }
  ]);

  const task: Task = {
    name: 'Example Task',
    type: 'command' as TaskType,
    command: 'echo "Hello World"'
  };

  const workflow: Workflow = {
    name: answers.workflow_name,
    description: 'Initial workflow',
    tasks: [task]
  };

  const config: DevFlowConfig = {
    project_name: answers.project_name,
    version: '1.0.0',
    workflows: {
      [answers.workflow_name]: workflow
    }
  };

  const yaml = generateYaml(config);
  writeFileSync('devflow.yaml', yaml);
  Logger.success('Created devflow.yaml');
}

function generateYaml(config: DevFlowConfig): string {
  const workflow = config.workflows[Object.keys(config.workflows)[0]];
  const task = workflow.tasks[0];
  
  return `# DevFlow Configuration
project_name: ${config.project_name}
version: ${config.version}

workflows:
  ${workflow.name}:
    name: ${workflow.name}
    description: ${workflow.description}
    tasks:
      - name: ${task.name}
        type: ${task.type}
        command: ${task.command}
`;
} 