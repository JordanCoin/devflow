import Docker from 'dockerode';
import * as logging from '../utils/logging';

export interface Resource {
  id: string;
  name: string;
  type: 'docker' | 'process';
}

interface CleanupOptions {
  shouldExit?: boolean;
}

export class CleanupManager {
  private static resources: Resource[] = [];
  private static isShuttingDown = false;
  private static docker: Docker;
  private static shouldExit = true;
  private static cleanupPromise: Promise<void> | null = null;

  static initialize(options: CleanupOptions = {}): void {
    this.shouldExit = options.shouldExit ?? true;
    this.docker = new Docker();
    
    process.on('SIGINT', () => this.triggerCleanup('SIGINT'));
    process.on('SIGTERM', () => this.triggerCleanup('SIGTERM'));
    process.on('uncaughtException', (error: Error) => {
      logging.error(`Uncaught exception: ${error.message}`, error);
      this.triggerCleanup('uncaughtException');
    });
  }

  static registerContainer(containerId: string): void {
    this.resources.push({
      type: 'docker',
      id: containerId,
      name: containerId
    });
  }

  static registerProcess(processId: number): void {
    this.resources.push({
      type: 'process',
      id: processId.toString(),
      name: processId.toString()
    });
  }

  static async triggerCleanup(signal: string): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logging.info(`\nReceived ${signal}, cleaning up...`);

    // Create a copy of the resources array before reversing
    const resourcesToCleanup = [...this.resources].reverse();

    try {
      // Clean up resources in reverse order
      this.cleanupPromise = Promise.all(
        resourcesToCleanup.map(resource => 
          resource.type === 'docker' 
            ? this.cleanupDockerContainer(resource.id) 
            : this.cleanupProcess(resource.id)
        )
      ).then(() => {
        logging.info('Cleanup completed');
        if (this.shouldExit) {
          process.exit(0);
        }
      });

      await this.cleanupPromise;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logging.error(`Cleanup failed: ${errorMessage}`);
      if (this.shouldExit) {
        process.exit(1);
      }
    }
  }

  static async cleanupDockerContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      const containerInfo = await container.inspect();
      if (containerInfo.State?.Running) {
        await container.stop();
        logging.info(`Stopped container ${containerId}`);
      } else {
        logging.warn(`Container ${containerId} is not running`);
      }
      await container.remove();
      logging.info(`Removed container ${containerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('no such container')) {
        logging.warn(`Container ${containerId} does not exist`);
        return;
      }
      logging.error(`Failed to cleanup container ${containerId}: ${errorMessage}`);
      throw error;
    }
  }

  static async cleanupProcess(processId: string): Promise<void> {
    const pid = parseInt(processId, 10);
    try {
      // First check if process exists with signal 0
      process.kill(pid, 0);
      try {
        // Then attempt to terminate it with default signal (SIGTERM)
        process.kill(pid);
        logging.info(`Terminated process ${processId}`);
      } catch (killError) {
        // If kill fails with ESRCH, process doesn't exist anymore
        if (killError instanceof Error && 'code' in killError && killError.code === 'ESRCH') {
          logging.warn(`Process ${processId} not found during termination`);
          return;
        }
        throw killError;
      }
    } catch (checkError) {
      // If existence check fails with ESRCH, process doesn't exist
      if (checkError instanceof Error && 'code' in checkError && checkError.code === 'ESRCH') {
        logging.warn(`Process ${processId} not found`);
        return;
      }
      const errorMessage = checkError instanceof Error ? checkError.message : String(checkError);
      logging.error(`Failed to terminate process ${processId}: ${errorMessage}`);
      throw checkError;
    }
  }

  static addResource(resource: Resource): void {
    this.resources.push(resource);
  }

  static removeResource(id: string): void {
    this.resources = this.resources.filter(r => r.id !== id);
  }

  static getResources(): Resource[] {
    return [...this.resources];
  }

  static clear(): void {
    this.resources = [];
  }

  // For testing purposes only
  static reset(): void {
    this.resources = [];
    this.isShuttingDown = false;
    this.cleanupPromise = null;
    this.docker = new Docker();
  }

  // For testing purposes only
  static async waitForCleanup(): Promise<void> {
    if (this.cleanupPromise) {
      await this.cleanupPromise;
    }
  }
} 