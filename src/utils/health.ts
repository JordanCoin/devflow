import net from 'net';
import http from 'http';
import { ServiceHealthCheck } from '../types';
import { Logger } from '../core/logger';

export class HealthChecker {
  private static isTestMode = process.env.NODE_ENV === 'test';

  static async waitForService(check: ServiceHealthCheck): Promise<boolean> {
    // Validate custom health check
    if (check.type === 'custom' && !check.customCheck) {
      throw new Error('Custom health check requires customCheck function');
    }

    try {
      Logger.debug(`Checking health of service at ${check.host}:${check.port}`);
      
      let isHealthy: boolean;
      
      switch (check.type) {
        case 'tcp':
          isHealthy = await this.checkTCP(check);
          break;
        case 'http':
          isHealthy = await this.checkHTTP(check);
          break;
        case 'custom':
          isHealthy = await check.customCheck!();
          break;
        default:
          throw new Error(`Unsupported health check type: ${check.type}`);
      }

      if (isHealthy) {
        Logger.debug('Health check passed');
        return true;
      }
    } catch (error) {
      Logger.debug(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return false;
  }

  private static checkTCP(check: ServiceHealthCheck): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isResolved = false;

      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
        }
      };

      socket.setTimeout(check.interval);

      socket.on('connect', () => {
        cleanup();
        resolve(true);
      });

      socket.on('timeout', () => {
        cleanup();
        resolve(false);
      });

      socket.on('error', () => {
        cleanup();
        resolve(false);
      });

      socket.connect(check.port, check.host);
    });
  }

  private static checkHTTP(check: ServiceHealthCheck): Promise<boolean> {
    return new Promise((resolve) => {
      const path = check.path || '/';
      const url = `http://${check.host}:${check.port}${path}`;
      let isResolved = false;

      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
        }
      };

      const req = http.get(url, (res) => {
        cleanup();
        resolve(res.statusCode !== undefined && res.statusCode < 400);
      });

      req.setTimeout(check.interval);

      req.on('timeout', () => {
        cleanup();
        req.destroy();
        resolve(false);
      });

      req.on('error', () => {
        cleanup();
        resolve(false);
      });
    });
  }
} 