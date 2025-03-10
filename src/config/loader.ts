import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { DevFlowConfig } from '../types';
import { Logger } from '../core/logger';

export class ConfigLoader {
  static load(configPath: string): DevFlowConfig {
    try {
      const fileContents = readFileSync(configPath, 'utf8');
      const config = parse(fileContents) as DevFlowConfig;
      
      this.validateConfig(config);
      return config;
    } catch (error) {
      Logger.error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private static validateConfig(config: DevFlowConfig): void {
    if (!config.project_name) {
      throw new Error('Missing project_name in config');
    }

    if (!config.version) {
      throw new Error('Missing version in config');
    }

    if (!config.workflows || Object.keys(config.workflows).length === 0) {
      throw new Error('No workflows defined in config');
    }

    // Validate each workflow
    Object.entries(config.workflows).forEach(([name, workflow]) => {
      if (!workflow.name) {
        throw new Error(`Workflow ${name} missing name property`);
      }

      if (!workflow.tasks || workflow.tasks.length === 0) {
        throw new Error(`Workflow ${name} has no tasks defined`);
      }

      // Validate each task
      workflow.tasks.forEach((task, index) => {
        if (!task.name) {
          throw new Error(`Task ${index} in workflow ${name} missing name property`);
        }

        if (!task.type) {
          throw new Error(`Task ${task.name} in workflow ${name} missing type property`);
        }

        if (!['command', 'docker'].includes(task.type)) {
          throw new Error(`Task ${task.name} in workflow ${name} has invalid type: ${task.type}`);
        }

        if (task.type === 'docker' && !task.image) {
          throw new Error(`Docker task ${task.name} in workflow ${name} missing image property`);
        }

        if (task.type === 'command' && !task.command) {
          throw new Error(`Command task ${task.name} in workflow ${name} missing command property`);
        }
      });
    });
  }
} 