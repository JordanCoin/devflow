import { Container, ContainerLogsOptions } from 'dockerode';
import { Readable } from 'stream';
import { Logger } from '../core/logger';
import { CleanupManager } from '../core/cleanup';
import Docker from 'dockerode';

export interface LogOptions {
  follow?: boolean;
  timestamps?: boolean;
  filter?: string;
  testing?: boolean;
}

export interface LogLine {
  message: string;
  isError: boolean;
  timestamp?: string;
}

export class LogStreamer {
  private currentStream: Readable | null = null;

  constructor(
    private container: Container,
    private options: LogOptions = {}
  ) {}

  processChunk(chunk: Buffer): LogLine | null {
    const header = chunk.slice(0, 8);
    const streamType = header[0];
    const data = chunk.slice(8).toString().trim();

    if (this.options.filter && !data.includes(this.options.filter)) {
      return null;
    }

    // Docker log format: <timestamp> <message>
    let message = data;
    let timestamp: string | undefined = undefined;

    if (this.options.timestamps) {
      const timestampMatch = data.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\s(.+)$/);
      if (timestampMatch) {
        timestamp = timestampMatch[1];
        message = timestampMatch[2];
      }
    }

    return {
      message,
      isError: streamType === 2,
      timestamp
    };
  }

  async streamLogs(onLog: (line: LogLine) => void): Promise<void> {
    const stream = this.options.follow
      ? (await this.container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          timestamps: this.options.timestamps ?? false
        } as any)) as unknown as Readable
      : (await this.container.logs({
          follow: false,
          stdout: true,
          stderr: true,
          timestamps: this.options.timestamps ?? false
        } as any)) as unknown as Readable;

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        const line = this.processChunk(chunk);
        if (line) {
          onLog(line);
        }
      });

      stream.on('error', (error: Error) => {
        stream.destroy();
        reject(error);
      });

      stream.on('end', () => {
        stream.destroy();
        resolve();
      });

      this.currentStream = stream;
    });
  }

  stop(): void {
    if (this.currentStream) {
      this.currentStream.destroy();
      this.currentStream = null;
    }
  }

  async getContainerInfo() {
    const info = await this.container.inspect();
    return {
      name: info.Name.replace(/^\//, ''),
      id: info.Id
    };
  }
}

export async function logsCommand(resourceName: string, options: LogOptions = {}): Promise<void> {
  try {
    const resource = CleanupManager.getResources().find(
      r => r.id === resourceName || r.name === resourceName
    );

    if (!resource) {
      throw new Error(`Resource "${resourceName}" not found`);
    }

    if (resource.type !== 'docker') {
      throw new Error(`Cannot stream logs for resource type: ${resource.type}`);
    }

    const docker = new Docker();
    const container = docker.getContainer(resource.id);
    const streamer = new LogStreamer(container, options);

    const { name, id } = await streamer.getContainerInfo();
    Logger.info(`Showing logs for container ${name} (${id})`);

    if (!options.testing) {
      process.on('SIGINT', () => {
        streamer.stop();
        process.exit(0);
      });
    }

    await streamer.streamLogs((line: LogLine) => {
      if (line.isError) {
        Logger.error(line.message);
      } else {
        Logger.info(line.message);
      }
    });

  } catch (error: unknown) {
    if (!options.testing) {
      Logger.error(`Failed to stream logs: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    throw error;
  }
} 