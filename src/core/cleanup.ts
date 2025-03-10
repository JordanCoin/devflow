import Docker from 'dockerode';
import { Logger } from './logger';

export interface Resource {
  id: string;
  name: string;
  type: 'docker' | 'process';
}

export class CleanupManager {
  private static resources: Resource[] = [];
  private static isShuttingDown = false;
  private static docker: Docker;
  private static shouldExit = true;
  private static cleanupPromise: Promise<void> | null = null;

  static initialize(options: { shouldExit?: boolean } = {}) {
    this.shouldExit = options.shouldExit ?? true;
    this.docker = new Docker();
    process.on('SIGINT', () => this.triggerCleanup('SIGINT'));
    process.on('SIGTERM', () => this.triggerCleanup('SIGTERM'));
    process.on('uncaughtException', (error) => {
      Logger.error(`Uncaught exception: ${error.message}`);
      this.triggerCleanup('uncaughtException');
    });
  }

  static registerContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    this.resources.push({
      type: 'docker',
      id: containerId,
      name: containerId
    });
  }

  static registerProcess(processId: number) {
    this.resources.push({
      type: 'process',
      id: processId.toString(),
      name: processId.toString()
    });
  }

  static async triggerCleanup(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    Logger.info(`\nReceived ${signal}, cleaning up...`);

    // Create a copy of the resources array before reversing
    const resourcesToCleanup = [...this.resources].reverse();

    try {
      // Clean up resources in reverse order
      this.cleanupPromise = Promise.all(
        resourcesToCleanup.map(resource => resource.type === 'docker' ? this.cleanupDockerContainer(resource.id) : this.cleanupProcess(resource.id))
      ).then(() => {
        Logger.success('Cleanup completed');
        if (this.shouldExit) {
          process.exit(0);
        }
      });

      await this.cleanupPromise;
    } catch (error) {
      Logger.error(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      if (this.shouldExit) {
        process.exit(1);
      }
    }
  }

  static async cleanupDockerContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.stop();
      await container.remove();
      Logger.success(`Removed container ${containerId}`);
    } catch (error) {
      Logger.error(`Failed to cleanup container ${containerId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw to ensure proper error handling
    }
  }

  static async cleanupProcess(processId: string): Promise<void> {
    try {
      process.kill(parseInt(processId));
      Logger.success(`Terminated process ${processId}`);
    } catch (error) {
      Logger.error(`Failed to terminate process ${processId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw to ensure proper error handling
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
  static reset() {
    this.resources = [];
    this.isShuttingDown = false;
    this.cleanupPromise = null;
    this.docker = new Docker();
  }

  // For testing purposes only
  static async waitForCleanup() {
    if (this.cleanupPromise) {
      await this.cleanupPromise;
    }
  }
} 