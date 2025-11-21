import { existsSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { ConfigLoader } from '../config/loader';
import { DevFlowError } from '../core/errors';
import { DevFlowConfig, Task } from '../types';
import { logger } from '../utils/logger';

interface LLMOptions {
  config?: string;
  format?: 'text' | 'json';
}

interface LLMTaskSummary {
  name: string;
  type: Task['type'];
  command?: string;
  image?: string;
  env?: Record<string, string>;
  depends_on?: string[];
  parallel?: boolean;
  health_check?: Task['health_check'];
  ports?: string[];
}

interface LLMWorkflowSummary {
  key: string;
  name: string;
  description?: string;
  parallel?: boolean;
  tasks: LLMTaskSummary[];
}

interface LLMGuide {
  project: {
    name: string;
    version: string;
  };
  workflows: LLMWorkflowSummary[];
  tips: string[];
}

function buildGuide(config: DevFlowConfig): LLMGuide {
  const workflows: LLMWorkflowSummary[] = Object.entries(config.workflows).map(
    ([key, workflow]) => ({
      key,
      name: workflow.name,
      description: workflow.description,
      parallel: workflow.parallel,
      tasks: workflow.tasks.map(task => ({
        name: task.name,
        type: task.type,
        command: task.command,
        image: task.image,
        env: task.env,
        depends_on: task.depends_on,
        parallel: task.parallel,
        health_check: task.health_check,
        ports: task.ports
      }))
    })
  );

  return {
    project: {
      name: config.project_name,
      version: config.version
    },
    workflows,
    tips: [
      'Use `devflow detect` to discover services before running workflows.',
      'Run `devflow test <workflow> --env <environment>` to execute a workflow.',
      'Enable parallel execution with the `--parallel` flag when tasks are independent.',
      'Inspect the `tasks[].depends_on` field to determine execution order for LLM agents.',
      'Prefer the JSON output for machine parsing in LLM-driven CLIs.'
    ]
  };
}

function printTextGuide(guide: LLMGuide): void {
  logger.success(`LLM context for ${guide.project.name} v${guide.project.version}`);
  logger.info('Workflows summary:');

  guide.workflows.forEach(workflow => {
    const header = workflow.description
      ? `${workflow.name} (${workflow.key}) - ${workflow.description}`
      : `${workflow.name} (${workflow.key})`;
    logger.info(`• ${header}`);
    workflow.tasks.forEach(task => {
      const primary = task.type === 'docker' ? task.image : task.command;
      const details = primary ? ` → ${primary}` : '';
      const dependencies = task.depends_on?.length ? ` [depends on: ${task.depends_on.join(', ')}]` : '';
      logger.debug(`  - ${task.name} (${task.type})${details}${dependencies}`);
    });
  });

  logger.info('\nTips for CLI-driven LLMs:');
  guide.tips.forEach(tip => logger.info(`- ${tip}`));
}

export async function generateLLMGuide(options: LLMOptions = {}): Promise<void> {
  const providedPath = options.config ?? 'devflow.yaml';
  const configPath = isAbsolute(providedPath)
    ? providedPath
    : resolve(process.cwd(), providedPath);

  if (!existsSync(configPath)) {
    throw new DevFlowError(
      `Configuration file not found at ${configPath}`,
      'CONFIG_NOT_FOUND',
      ['Ensure devflow.yaml exists', 'Pass a custom path with --config']
    );
  }

  const config = ConfigLoader.load(configPath);
  const guide = buildGuide(config);

  if (options.format === 'json') {
    console.log(JSON.stringify(guide, null, 2));
    return;
  }

  printTextGuide(guide);
}

export function buildLLMGuide(config: DevFlowConfig): LLMGuide {
  return buildGuide(config);
}
