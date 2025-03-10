import { spawn, ChildProcess } from 'child_process';
import Docker from 'dockerode';
import { Task, ExecutionContext, RetryOptions, ServiceHealthCheck, Workflow } from '../types';
import { Logger } from './logger';
import { EnvLoader } from '../utils/env';
import { HealthChecker } from '../utils/health';
import { CleanupManager } from './cleanup';
import { RetryError, TaskError, HealthCheckError } from '../utils/errors';

export class TaskExecutor {
  private docker: Docker;
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    attempts: 3,
    backoff: {
      initialDelay: 1000,
      maxDelay: 10000,
      factor: 2
    }
  };

  constructor() {
    this.docker = new Docker();
  }

  async executeWorkflow(workflow: Workflow, context: ExecutionContext): Promise<boolean> {
    Logger.info(`Starting workflow: ${workflow.name}`);
    
    if (workflow.parallel) {
      return this.executeParallelTasks(workflow.tasks, context);
    }

    // For non-parallel workflows, group consecutive parallel tasks
    const taskGroups: Task[][] = [];
    let currentGroup: Task[] = [];

    for (const task of workflow.tasks) {
      if (task.parallel) {
        currentGroup.push(task);
      } else {
        if (currentGroup.length > 0) {
          taskGroups.push([...currentGroup]);
          currentGroup = [];
        }
        taskGroups.push([task]);
      }
    }

    if (currentGroup.length > 0) {
      taskGroups.push(currentGroup);
    }

    // Execute each group
    for (const group of taskGroups) {
      if (group.length === 1 && !group[0].parallel) {
        // Sequential task
        const success = await this.executeTask(group[0], context);
        if (!success) {
          throw new Error(`Task "${group[0].name}" failed`);
        }
      } else {
        // Parallel group
        const success = await this.executeParallelTasks(group, context);
        if (!success) {
          throw new Error('One or more parallel tasks failed');
        }
      }
    }

    return true;
  }

  private async executeParallelTasks(tasks: Task[], context: ExecutionContext): Promise<boolean> {
    // Build dependency graph
    const taskMap = new Map<string, Task>();
    const dependencyGraph = new Map<string, Set<string>>();
    const inProgress = new Set<string>();
    const completed = new Set<string>();

    // Initialize maps
    tasks.forEach(task => {
      taskMap.set(task.name, task);
      dependencyGraph.set(task.name, new Set(task.depends_on || []));
    });

    // Execute tasks that have no dependencies or all dependencies are met
    const executeTasks = async () => {
      const executableTasks: Promise<boolean>[] = [];

      for (const [taskName, dependencies] of dependencyGraph.entries()) {
        if (completed.has(taskName) || inProgress.has(taskName)) continue;

        // Check if all dependencies are completed
        const canExecute = Array.from(dependencies).every(dep => completed.has(dep));
        if (canExecute) {
          inProgress.add(taskName);
          const task = taskMap.get(taskName)!;
          
          executableTasks.push(
            this.executeTask(task, context)
              .then(success => {
                if (success) {
                  completed.add(taskName);
                  inProgress.delete(taskName);
                }
                return success;
              })
              .catch(error => {
                Logger.error(`Task ${taskName} failed: ${error.message}`);
                return false;
              })
          );
        }
      }

      if (executableTasks.length === 0) {
        if (completed.size < tasks.length) {
          const remaining = tasks.filter(t => !completed.has(t.name));
          const unmetDeps = remaining.map(t => ({
            task: t.name,
            deps: t.depends_on?.filter(d => !completed.has(d)) || []
          }));
          throw new Error(
            `Deadlock detected. The following tasks have unmet dependencies:\n${
              unmetDeps.map(({task, deps}) => `  ${task}: needs [${deps.join(', ')}]`).join('\n')
            }`
          );
        }
        return true;
      }

      const results = await Promise.all(executableTasks);
      if (results.some(r => !r)) {
        throw new Error('One or more parallel tasks failed');
      }

      // Continue executing tasks if there are more
      if (completed.size < tasks.length) {
        return executeTasks();
      }

      return true;
    };

    return executeTasks();
  }

  async executeTask(task: Task, context: ExecutionContext): Promise<boolean> {
    Logger.info(`Starting task: ${task.name}`);
    
    try {
      if (context.dryRun) {
        Logger.info(`[DRY RUN] Would execute task: ${task.name}`);
        return true;
      }

      // Load environment variables from file if specified
      let taskEnv = task.env || {};
      if (task.env_file) {
        const fileEnv = EnvLoader.loadEnvFile(task.env_file);
        taskEnv = EnvLoader.mergeEnv(taskEnv, fileEnv);
      }

      switch (task.type) {
        case 'command':
          return await this.executeCommand(task, { ...context, env: taskEnv });
        case 'docker':
          return await this.executeDocker(task, { ...context, env: taskEnv });
        default:
          throw new TaskError(`Unknown task type: ${task.type}`, task);
      }
    } catch (err) {
      // Type guard functions
      const isTaskError = (e: unknown): e is TaskError => e instanceof TaskError;
      const isRetryError = (e: unknown): e is RetryError => e instanceof RetryError;
      const isHealthCheckError = (e: unknown): e is HealthCheckError => e instanceof HealthCheckError;

      if (isTaskError(err)) {
        Logger.error(`Task ${task.name} failed: ${err.message}`);
        Logger.debug(`Task details: ${JSON.stringify(err.task)}`);
      } else if (isRetryError(err)) {
        Logger.error(`Task ${task.name} failed after ${err.attempts} attempts: ${err.message}`);
      } else if (isHealthCheckError(err)) {
        Logger.error(`Health check failed for ${task.name}: ${err.message}`);
        Logger.debug(`Health check details: ${JSON.stringify(err.check)}`);
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Task ${task.name} failed with unexpected error: ${error.message}`);
      }
      return false;
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = TaskExecutor.DEFAULT_RETRY_OPTIONS
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = options.backoff.initialDelay;

    for (let attempt = 1; attempt <= options.attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === options.attempts) break;
        
        Logger.debug(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * options.backoff.factor, options.backoff.maxDelay);
      }
    }

    throw new RetryError(
      `Operation failed after ${options.attempts} attempts`,
      options.attempts,
      lastError
    );
  }

  private async executeCommand(task: Task, context: ExecutionContext): Promise<boolean> {
    if (!task.command) {
      throw new TaskError('Command task requires command property', task);
    }

    const [cmd, ...args] = task.command.split(' ');

    return new Promise((resolve, reject) => {
      Logger.startSpinner(`Running command: ${task.command}`);
      
      const envVars = EnvLoader.mergeEnv(
        process.env as Record<string, string>,
        context.env,
        task.env || {}
      );
      
      const childProcess: ChildProcess = spawn(cmd, args, { 
        env: envVars, 
        shell: true 
      });

      if (childProcess.pid) {
        CleanupManager.registerProcess(childProcess.pid);
      }

      let output = '';
      let errorOutput = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        Logger.debug(data.toString());
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
        Logger.debug(data.toString());
      });

      childProcess.on('error', (error: Error) => {
        Logger.stopSpinner(false);
        reject(new TaskError(`Command failed to start: ${error.message}`, task));
      });

      childProcess.on('close', (code: number | null) => {
        Logger.stopSpinner(code === 0);
        if (code === 0) {
          resolve(true);
        } else {
          reject(new TaskError(
            `Command failed with exit code ${code}\nOutput: ${output}\nError: ${errorOutput}`,
            task
          ));
        }
      });
    });
  }

  private async executeDocker(task: Task, context: ExecutionContext): Promise<boolean> {
    if (!task.image) {
      throw new TaskError('Docker task requires image property', task);
    }

    try {
      Logger.startSpinner(`Starting container: ${task.container_name || task.image}`);
      
      // Pull image with retry
      await this.retryOperation(async () => {
        Logger.debug(`Pulling image: ${task.image}`);
        await this.docker.pull(task.image as string);
      });

      // Create container
      const container = await this.docker.createContainer({
        Image: task.image,
        name: task.container_name,
        Env: this.formatEnvVars({ ...context.env, ...task.env }),
        HostConfig: {
          AutoRemove: true
        }
      });

      CleanupManager.registerContainer(container.id);

      // Start container with retry
      await this.retryOperation(async () => {
        Logger.debug(`Starting container: ${container.id}`);
        await container.start();
      });

      // Enhanced health checks for different service types
      if (task.type === 'docker' && task.container_name) {
        const healthCheck: ServiceHealthCheck = {
          type: this.determineHealthCheckType(task.image),
          host: 'localhost',
          port: this.getDefaultPort(task.image),
          retries: 5,
          interval: 2000,
          timeout: 30000
        };

        const healthy = await this.retryOperation(
          () => HealthChecker.waitForService(healthCheck),
          {
            attempts: healthCheck.retries,
            backoff: {
              initialDelay: healthCheck.interval,
              maxDelay: 10000,
              factor: 1.5
            }
          }
        );

        if (!healthy) {
          throw new HealthCheckError(
            `Container ${task.container_name} failed health check`,
            healthCheck
          );
        }
      }

      Logger.stopSpinner(true);
      return true;
    } catch (error) {
      Logger.stopSpinner(false);
      throw error;
    }
  }

  private determineHealthCheckType(image: string): 'tcp' | 'http' | 'custom' {
    if (image.includes('nginx') || image.includes('web')) {
      return 'http';
    }
    // Add more service-specific health check types here
    return 'tcp';
  }

  private formatEnvVars(env: Record<string, string> = {}): string[] {
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }

  private getDefaultPort(image: string): number {
    // Common default ports for services
    const defaultPorts: Record<string, number> = {
      'postgres': 5432,
      'redis': 6379,
      'mysql': 3306,
      'mongodb': 27017,
      'nginx': 80
    };

    for (const [service, port] of Object.entries(defaultPorts)) {
      if (image.includes(service)) {
        return port;
      }
    }

    return 8080; // Default fallback port
  }
} 