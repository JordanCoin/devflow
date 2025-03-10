import { CleanupManager } from '../../core/cleanup';
import Docker from 'dockerode';

jest.mock('dockerode');

describe('CleanupManager', () => {
  const mockContainer = {
    stop: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    inspect: jest.fn().mockResolvedValue({
      State: {
        Running: true
      }
    })
  };

  const mockDocker = {
    getContainer: jest.fn().mockReturnValue(mockContainer)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Docker as unknown as jest.Mock).mockImplementation(() => mockDocker);
    CleanupManager.reset();
    CleanupManager.initialize({ shouldExit: false });
  });

  describe('registerContainer', () => {
    it('should register a container for cleanup', async () => {
      const containerId = 'test-container-123';
      
      // Register container and trigger cleanup immediately
      CleanupManager.registerContainer(containerId);
      await CleanupManager.triggerCleanup('TEST');

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should handle container cleanup errors', async () => {
      const containerId = 'error-container';
      mockContainer.stop.mockRejectedValueOnce(new Error('Stop failed'));

      // Register container and trigger cleanup immediately
      CleanupManager.registerContainer(containerId);
      await CleanupManager.triggerCleanup('TEST');

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).toHaveBeenCalled();
      // Remove should not be called if stop fails
      expect(mockContainer.remove).not.toHaveBeenCalled();
    });

    it('should handle non-running containers', async () => {
      const containerId = 'stopped-container';
      mockContainer.inspect.mockResolvedValueOnce({
        State: {
          Running: false
        }
      });

      CleanupManager.registerContainer(containerId);
      await CleanupManager.triggerCleanup('TEST');

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).not.toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });

  describe('registerProcess', () => {
    let mockKill: jest.SpyInstance;

    beforeEach(() => {
      mockKill = jest.spyOn(process, 'kill');
      mockKill.mockImplementation(() => true);
    });

    afterEach(() => {
      mockKill.mockRestore();
    });

    it('should register a process for cleanup', async () => {
      const processId = 12345;
      CleanupManager.registerProcess(processId);
      
      // Trigger cleanup immediately
      await CleanupManager.triggerCleanup('TEST');

      // First call is for checking existence (signal 0)
      expect(mockKill).toHaveBeenNthCalledWith(1, processId, 0);
      // Second call is for actual termination
      expect(mockKill).toHaveBeenNthCalledWith(2, processId);
    });

    it('should handle process cleanup errors', async () => {
      const processId = 99999;
      // Mock process.kill to throw ESRCH on the first call (existence check)
      mockKill.mockImplementationOnce(() => {
        const error = new Error('Process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      });

      CleanupManager.registerProcess(processId);
      await CleanupManager.triggerCleanup('TEST');

      // Only the existence check should be called
      expect(mockKill).toHaveBeenCalledTimes(1);
      expect(mockKill).toHaveBeenCalledWith(processId, 0);
    });
  });

  describe('signal handling', () => {
    it('should handle SIGTERM', async () => {
      const containerId = 'test-container';
      CleanupManager.registerContainer(containerId);

      // Trigger cleanup directly
      await CleanupManager.triggerCleanup('SIGTERM');

      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should handle uncaught exceptions', async () => {
      const containerId = 'test-container';
      CleanupManager.registerContainer(containerId);

      // Trigger cleanup directly
      await CleanupManager.triggerCleanup('uncaughtException');

      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });
}); 