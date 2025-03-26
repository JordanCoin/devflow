import { Readable } from 'stream';
import Docker from 'dockerode';
import { logsCommand } from '../../commands/logs';
import { CleanupManager } from '../../core/cleanup';
import * as logging from '../../utils/logging';
import { LogStreamer } from '../../commands/logs';

jest.mock('dockerode');
jest.mock('../../core/cleanup');
jest.mock('../../utils/logging');

const MockDocker = Docker as jest.MockedClass<typeof Docker>;
const MockCleanupManager = CleanupManager as jest.Mocked<typeof CleanupManager>;

// Increase Jest timeout for all tests in this file
jest.setTimeout(30000);

class MockStream extends Readable {
  private _destroyed = false;

  constructor() {
    super();
  }

  _read() {
    // Required by Readable stream
  }

  push(chunk: Buffer | null): boolean {
    if (chunk === null) {
      return super.push(null);
    }
    return super.push(chunk);
  }

  destroy(error?: Error): this {
    if (!this._destroyed) {
      this._destroyed = true;
      this.push(null);
    }
    return super.destroy(error);
  }
}

describe('logsCommand', () => {
  let mockContainer: any;
  let mockStream: MockStream;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStream = new MockStream();
    mockContainer = {
      inspect: jest.fn().mockResolvedValue({ Name: 'test-container', Id: 'test-id' }),
      logs: jest.fn().mockResolvedValue(mockStream)
    };
    MockDocker.mockImplementation(() => ({
      getContainer: jest.fn().mockReturnValue(mockContainer)
    } as any));
    (MockCleanupManager.getResources as jest.Mock).mockReturnValue([
      { id: 'test-container', name: 'test-container', type: 'docker' }
    ]);
  });

  afterEach(() => {
    mockStream.removeAllListeners();
    process.removeAllListeners('SIGINT');
  });

  it('should stream logs for a valid container', async () => {
    const commandPromise = logsCommand('test-container', { testing: true });
    
    mockStream.push(Buffer.concat([
      Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
      Buffer.from('test message')
    ]));
    mockStream.push(null);

    await commandPromise;
    expect(logging.info).toHaveBeenCalledWith('test message');
  });

  it('should handle non-existent resources', async () => {
    (MockCleanupManager.getResources as jest.Mock).mockReturnValue([]);
    await expect(logsCommand('non-existent', { testing: true }))
      .rejects.toThrow('Resource "non-existent" not found');
  });

  it('should handle process resources gracefully', async () => {
    (MockCleanupManager.getResources as jest.Mock).mockReturnValue([
      { id: 'test-process', name: 'test-process', type: 'process' }
    ]);
    await expect(logsCommand('test-process', { testing: true }))
      .rejects.toThrow('Cannot stream logs for resource type: process');
  });

  it('should apply log filtering when filter option is provided', async () => {
    const commandPromise = logsCommand('test-container', { testing: true, filter: 'error' });
    
    mockStream.push(Buffer.concat([
      Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
      Buffer.from('error message')
    ]));
    mockStream.push(null);

    await commandPromise;
    expect(logging.info).toHaveBeenCalledWith('error message');
  });

  it('should handle container inspection errors', async () => {
    mockContainer.inspect.mockRejectedValue(new Error('Inspection failed'));
    await expect(logsCommand('test-container', { testing: true }))
      .rejects.toThrow('Inspection failed');
  });

  it('should handle log streaming errors', async () => {
    mockContainer.logs.mockRejectedValue(new Error('Streaming failed'));
    await expect(logsCommand('test-container', { testing: true }))
      .rejects.toThrow('Streaming failed');
  });

  it('should handle SIGINT signal', async () => {
    const commandPromise = logsCommand('test-container', { testing: true, follow: true });
    
    mockStream.push(Buffer.concat([
      Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
      Buffer.from('test message')
    ]));
    process.emit('SIGINT');
    mockStream.push(null);

    await commandPromise;
    expect(logging.info).toHaveBeenCalledWith('test message');
  });
});

describe('LogStreamer', () => {
  let mockContainer: any;
  let mockStream: MockStream;
  let onLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStream = new MockStream();
    mockContainer = {
      inspect: jest.fn().mockResolvedValue({ Name: 'test-container', Id: 'test-id' }),
      logs: jest.fn().mockResolvedValue(mockStream)
    };
    onLog = jest.fn();
  });

  afterEach(() => {
    mockStream.removeAllListeners();
  });

  describe('processChunk', () => {
    it('should process stdout message', () => {
      const streamer = new LogStreamer(mockContainer);
      const chunk = Buffer.concat([
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
        Buffer.from('test message')
      ]);

      const result = streamer.processChunk(chunk);
      expect(result).toEqual({
        message: 'test message',
        isError: false,
        timestamp: undefined
      });
    });

    it('should process stderr message', () => {
      const streamer = new LogStreamer(mockContainer);
      const chunk = Buffer.concat([
        Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]),
        Buffer.from('error message')
      ]);

      const result = streamer.processChunk(chunk);
      expect(result).toEqual({
        message: 'error message',
        isError: true,
        timestamp: undefined
      });
    });

    it('should handle timestamps', () => {
      const streamer = new LogStreamer(mockContainer, { timestamps: true });
      const chunk = Buffer.concat([
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
        Buffer.from('2024-01-01T00:00:00.000Z test message')
      ]);

      const result = streamer.processChunk(chunk);
      expect(result).toEqual({
        message: 'test message',
        isError: false,
        timestamp: '2024-01-01T00:00:00.000Z'
      });
    });

    it('should filter messages', () => {
      const streamer = new LogStreamer(mockContainer, { filter: 'error' });
      const chunk = Buffer.concat([
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
        Buffer.from('error message')
      ]);

      expect(streamer.processChunk(chunk)).toBeTruthy();
    });
  });

  describe('streamLogs', () => {
    it('should handle non-follow mode', async () => {
      const streamer = new LogStreamer(mockContainer, { follow: false });
      const streamPromise = streamer.streamLogs(onLog);

      mockStream.push(Buffer.concat([
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
        Buffer.from('test message')
      ]));
      mockStream.push(null);

      await streamPromise;

      expect(onLog).toHaveBeenCalledWith({
        message: 'test message',
        isError: false,
        timestamp: undefined
      });
    });

    it('should handle stream errors', async () => {
      const streamer = new LogStreamer(mockContainer);
      const streamPromise = streamer.streamLogs(onLog);


      // Simulate a real stream error by pushing some data first
      mockStream.push(Buffer.concat([
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
        Buffer.from('test message')
      ]));

      // Then simulate a stream error (e.g., container crash)
      mockStream.destroy(new Error('Stream error'));

      await expect(streamPromise).rejects.toThrow('Stream error');
      expect(onLog).toHaveBeenCalledTimes(1);
      expect(onLog).toHaveBeenCalledWith({
        message: 'test message',
        isError: false,
        timestamp: undefined
      });
    });

    it('should stop streaming when requested', async () => {
      const streamer = new LogStreamer(mockContainer, { follow: true });
      const streamPromise = streamer.streamLogs(onLog);

      mockStream.push(Buffer.concat([
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
        Buffer.from('test message')
      ]));
      
      streamer.stop();
      mockStream.push(null);

      await streamPromise;
      expect(onLog).toHaveBeenCalledTimes(1);
    });
  });
}); 