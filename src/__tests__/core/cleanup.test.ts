import { CleanupManager } from '../../core/cleanup';
import Docker from 'dockerode';

jest.mock('dockerode');

describe('CleanupManager', () => {
  const mockContainer = {
    stop: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined)
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
      expect(mockContainer.stop).toHaveBeenCalled();
      // Remove should not be called if stop fails
      expect(mockContainer.remove).not.toHaveBeenCalled();
    });
  });

  describe('registerProcess', () => {
    const mockKill = jest.spyOn(process, 'kill');

    beforeEach(() => {
      mockKill.mockImplementation(() => true);
    });

    it('should register a process for cleanup', async () => {
      const processId = 12345;
      CleanupManager.registerProcess(processId);
      
      // Trigger cleanup immediately
      await CleanupManager.triggerCleanup('TEST');

      expect(mockKill).toHaveBeenCalledWith(processId);
    });

    it('should handle process cleanup errors', async () => {
      const processId = 99999;
      mockKill.mockImplementationOnce(() => {
        throw new Error('Process not found');
      });

      CleanupManager.registerProcess(processId);
      await CleanupManager.triggerCleanup('TEST');

      expect(mockKill).toHaveBeenCalledWith(processId);
    });
  });

  describe('signal handling', () => {
    it('should handle SIGTERM', async () => {
      const containerId = 'test-container';
      CleanupManager.registerContainer(containerId);

      // Trigger cleanup directly
      await CleanupManager.triggerCleanup('SIGTERM');

      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should handle uncaught exceptions', async () => {
      const containerId = 'test-container';
      CleanupManager.registerContainer(containerId);

      // Trigger cleanup directly
      await CleanupManager.triggerCleanup('uncaughtException');

      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });
}); 