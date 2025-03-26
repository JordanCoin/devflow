import { spawn } from 'child_process';
import Docker from 'dockerode';
import { Task, ExecutionContext, RetryOptions, Workflow } from '../types';
import { sanitizeCommand, sanitizeEnv } from '../utils/security';
import * as logging from '../utils/logging';
import { RetryError } from '../utils/errors';

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
    logging.info(`Starting workflow: ${workflow.name}`);
    
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
    const executeTasks = async (): Promise<boolean> => {
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
                logging.error(`Task ${taskName} failed: ${error.message}`);
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
    logging.info(`Starting task: ${task.name}`);
    
    if (context.dryRun) {
      logging.debug(`Dry run: ${JSON.stringify(task)}`);
      return true;
    }

    switch (task.type) {
      case 'command':
        return this.executeCommand(task, context);
      case 'docker':
        return this.executeDocker(task, context);
      default:
        logging.error(`Unknown task type: ${task.type}`);
        return false;
    }
  }

  private async executeCommand(task: Task, context: ExecutionContext): Promise<boolean> {
    if (!task.command) {
      logging.error(`No command specified for task: ${task.name}`);
      return false;
    }

    const sanitizedCommand = sanitizeCommand(task.command);
    const sanitizedEnv = task.env ? sanitizeEnv(task.env) : {};

    // Combine environment variables from context and task
    const env = {
      ...process.env,
      ...context.env,
      ...sanitizedEnv
    };

    return new Promise((resolve) => {
      const parts = sanitizedCommand.split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);
      
      logging.startSpinner(`Running command: ${sanitizedCommand}`);
      
      const childProcess = spawn(cmd, args, {
        env,
        cwd: context.cwd,
        shell: true,
        stdio: 'pipe'
      });

      let stderrData = '';

      childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        logging.debug(chunk.trim());
      });

      childProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderrData += chunk;
        logging.debug(chunk.trim());
      });

      childProcess.on('error', (error) => {
        logging.stopSpinner(false);
        logging.error(`Command failed to start: ${error.message}`);
        resolve(false);
      });

      childProcess.on('close', (code) => {
        const success = code === 0;
        logging.stopSpinner(success);
        
        if (success) {
          logging.success(`Command completed successfully: ${sanitizedCommand}`);
        } else {
          logging.error(`Command failed with exit code ${code}: ${sanitizedCommand}`);
          if (stderrData) {
            logging.error(`Error output: ${stderrData.trim()}`);
          }
        }
        
        resolve(success);
      });
    });
  }

  private async executeDocker(task: Task, context: ExecutionContext): Promise<boolean> {
    if (!task.image) {
      logging.error(`No image specified for docker task: ${task.name}`);
      return false;
    }

    const containerName = task.container_name || `${context.config.project_name}-${task.name}`;
    
    // Combine environment variables
    const sanitizedEnv = task.env ? sanitizeEnv(task.env) : {};
    const env = Object.entries({
      ...context.env,
      ...sanitizedEnv
    }).map(([key, value]) => `${key}=${value}`);

    // Get port bindings if defined
    const portBindings = this.getPortBindings(task);

    try {
      // Check if container already exists and remove it
      logging.startSpinner(`Setting up container: ${containerName}`);
      
      try {
        const container = await this.docker.getContainer(containerName);
        const containerInfo = await container.inspect();
        
        if (containerInfo.State.Running) {
          logging.info(`Stopping container: ${containerName}`);
          await container.stop();
        }
        
        logging.info(`Removing container: ${containerName}`);
        await container.remove();
      } catch (err) {
        // Container doesn't exist, continue
        const error = err instanceof Error ? err : new Error(String(err));
        logging.debug(`Container does not exist yet: ${containerName} (${error.message})`);
      }

      // Create and start the container
      logging.info(`Creating container: ${containerName} from image ${task.image}`);
      
      const createOptions: Docker.ContainerCreateOptions = {
        Image: task.image,
        name: containerName,
        Env: env,
        HostConfig: {
          PortBindings: portBindings
        },
        ExposedPorts: this.getExposedPorts(task)
      };

      const container = await this.docker.createContainer(createOptions);
      logging.info(`Starting container: ${containerName}`);
      await container.start();
      
      logging.stopSpinner(true);
      logging.success(`Container started: ${containerName}`);
      
      return true;
    } catch (err) {
      logging.stopSpinner(false);
      const error = err instanceof Error ? err : new Error(String(err));
      logging.error(`Failed to run docker container: ${error.message}`);
      return false;
    }
  }

  private getPortBindings(task: Task): Record<string, Array<{HostPort: string}>> {
    const portBindings: Record<string, Array<{HostPort: string}>> = {};
    
    if (task.ports && task.ports.length > 0) {
      task.ports.forEach(portStr => {
        const [hostPort, containerPort] = portStr.split(':');
        if (hostPort && containerPort) {
          const containerPortWithProto = `${containerPort}/tcp`;
          portBindings[containerPortWithProto] = [{ HostPort: hostPort }];
        }
      });
    }
    
    return portBindings;
  }

  private getExposedPorts(task: Task): Record<string, Record<string, never>> {
    const exposedPorts: Record<string, Record<string, never>> = {};
    
    if (task.ports && task.ports.length > 0) {
      task.ports.forEach(portStr => {
        const [, containerPort] = portStr.split(':');
        if (containerPort) {
          const containerPortWithProto = `${containerPort}/tcp`;
          exposedPorts[containerPortWithProto] = {};
        }
      });
    }
    
    return exposedPorts;
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
        
        logging.debug(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
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