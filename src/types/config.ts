export type TaskType = 'command' | 'docker';

export interface HealthCheck {
  type: 'tcp' | 'http';
  host: string;
  port: number;
  path?: string;
  retries: number;
  interval: number;
  timeout: number;
}

export interface Task {
  name: string;
  type: TaskType;
  command?: string;
  image?: string;
  container_name?: string;
  env?: Record<string, string>;
  health_check?: HealthCheck;
  depends_on?: string[];
  parallel?: boolean;
}

export interface Workflow {
  name: string;
  description?: string;
  tasks: Task[];
}

export interface DevFlowConfig {
  project_name: string;
  version: string;
  workflows: Record<string, Workflow>;
} 