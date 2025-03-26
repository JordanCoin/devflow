import * as logging from '../utils/logging';

export type TaskType = 'command' | 'docker';

export interface Task {
  name: string;
  type: TaskType;
  command?: string;
  image?: string;
  container_name?: string;
  env?: Record<string, string>;
  env_file?: string;
  parallel?: boolean;
  depends_on?: string[];  // Names of tasks this task depends on
  health_check?: ServiceHealthCheck;
  ports?: string[];  // Port bindings in format "hostPort:containerPort"
}

export interface Workflow {
  name: string;
  description?: string;
  tasks: Task[];
  parallel?: boolean;  // Whether all tasks in this workflow should run in parallel by default
}

export interface DevFlowConfig {
  project_name: string;
  version: string;
  workflows: Record<string, Workflow>;
}

export interface ExecutionContext {
  config: DevFlowConfig;
  workflowName: string;
  env: Record<string, string>;
  cwd: string;
  logger: typeof logging;
  dryRun?: boolean;
}

export interface RetryOptions {
  attempts: number;
  backoff: {
    initialDelay: number;
    maxDelay: number;
    factor: number;
  };
}

export interface ServiceHealthCheck {
  type: 'tcp' | 'http' | 'custom';
  host: string;
  port: number;
  path?: string;  // For HTTP health checks
  retries: number;
  interval: number;
  timeout: number;
  customCheck?: () => Promise<boolean>;  // For custom health checks
} 