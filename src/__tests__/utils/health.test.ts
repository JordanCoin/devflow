import { HealthChecker } from '../../utils/health';
import { ServiceHealthCheck } from '../../types';
import { createConnection } from 'net';

// Mock net.Socket
class MockSocket {
  destroy = jest.fn();
  on = jest.fn();
  connect = jest.fn();
  setTimeout = jest.fn();
  eventHandlers: { [key: string]: Function[] } = {};

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers[event] || [];
    handlers.forEach(handler => handler(...args));
  }

  addListener(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
    return this;
  }
}

// Mock net module
const mockSocket = new MockSocket();
jest.mock('net', () => ({
  createConnection: jest.fn(() => mockSocket),
  Socket: jest.fn(() => mockSocket)
}));

describe('HealthChecker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.eventHandlers = {};
  });

  const mockCheck: ServiceHealthCheck = {
    type: 'tcp',
    host: 'localhost',
    port: 5432,
    retries: 2,
    interval: 10,
    timeout: 100
  };

  describe('TCP health checks', () => {
    it('should return true when service is healthy', async () => {
      // Setup event handling
      mockSocket.on.mockImplementation((event, callback) => {
        mockSocket.addListener(event, callback);
        return mockSocket;
      });

      // Start the health check and emit connect event
      const checkPromise = HealthChecker.waitForService(mockCheck);
      mockSocket.emit('connect');

      const result = await checkPromise;
      expect(result).toBe(true);
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should return false when service is not available', async () => {
      // Setup event handling
      mockSocket.on.mockImplementation((event, callback) => {
        mockSocket.addListener(event, callback);
        return mockSocket;
      });

      // Start the health check and emit error event
      const checkPromise = HealthChecker.waitForService(mockCheck);
      mockSocket.emit('error', new Error('Connection refused'));

      const result = await checkPromise;
      expect(result).toBe(false);
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should handle timeout', async () => {
      // Setup event handling
      mockSocket.on.mockImplementation((event, callback) => {
        mockSocket.addListener(event, callback);
        return mockSocket;
      });

      // Start the health check and emit timeout event
      const checkPromise = HealthChecker.waitForService(mockCheck);
      mockSocket.emit('timeout');

      const result = await checkPromise;
      expect(result).toBe(false);
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('HTTP health checks', () => {
    it('should handle HTTP health checks', async () => {
      const check: ServiceHealthCheck = {
        type: 'http',
        host: 'localhost',
        port: 8080,
        path: '/health',
        retries: 1,
        interval: 10,
        timeout: 50
      };

      const result = await HealthChecker.waitForService(check);
      expect(result).toBe(false); // Since we're not mocking http
    });
  });

  describe('Custom health checks', () => {
    it('should handle successful custom health checks', async () => {
      const check: ServiceHealthCheck = {
        type: 'custom',
        host: 'localhost',
        port: 8080,
        retries: 1,
        interval: 10,
        timeout: 50,
        customCheck: jest.fn().mockResolvedValue(true)
      };

      const result = await HealthChecker.waitForService(check);
      expect(result).toBe(true);
      expect(check.customCheck).toHaveBeenCalled();
    });

    it('should handle failed custom health checks', async () => {
      const check: ServiceHealthCheck = {
        type: 'custom',
        host: 'localhost',
        port: 8080,
        retries: 1,
        interval: 10,
        timeout: 50,
        customCheck: jest.fn().mockResolvedValue(false)
      };

      const result = await HealthChecker.waitForService(check);
      expect(result).toBe(false);
      expect(check.customCheck).toHaveBeenCalled();
    });

    it('should throw error if customCheck is not provided', async () => {
      const check: ServiceHealthCheck = {
        type: 'custom',
        host: 'localhost',
        port: 8080,
        retries: 1,
        interval: 10,
        timeout: 50
      };

      await expect(HealthChecker.waitForService(check)).rejects.toThrow(
        'Custom health check requires customCheck function'
      );
    });
  });
}); 