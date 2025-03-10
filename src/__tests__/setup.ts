import { jest } from '@jest/globals';
import { ChildProcess } from 'child_process';
import { Container } from 'dockerode';

// Mock Docker
jest.mock('dockerode', () => {
  const mockContainer = {
    id: 'test-container-id',
    start: jest.fn().mockReturnValue(Promise.resolve()),
    stop: jest.fn().mockReturnValue(Promise.resolve()),
    remove: jest.fn().mockReturnValue(Promise.resolve()),
    inspect: jest.fn().mockResolvedValue({
      State: {
        Running: true
      }
    }),
    logs: jest.fn().mockReturnValue(Promise.resolve({})),
    modem: {},
    rename: jest.fn(),
    update: jest.fn(),
    top: jest.fn(),
    exec: jest.fn(),
    commit: jest.fn(),
    cp: jest.fn(),
    diff: jest.fn(),
    export: jest.fn(),
    getArchive: jest.fn(),
    putArchive: jest.fn(),
    pause: jest.fn(),
    unpause: jest.fn(),
    resize: jest.fn(),
    attach: jest.fn(),
    wait: jest.fn(),
    kill: jest.fn(),
    restart: jest.fn(),
    stats: jest.fn(),
    changes: jest.fn()
  } as unknown as Container;

  return {
    default: jest.fn().mockImplementation(() => ({
      pull: jest.fn().mockReturnValue(Promise.resolve()),
      createContainer: jest.fn().mockReturnValue(Promise.resolve(mockContainer)),
      getContainer: jest.fn().mockReturnValue(mockContainer)
    }))
  };
});

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => {
    const mockProcess = {
      on: jest.fn(),
      stdout: {
        on: jest.fn(),
        pipe: jest.fn()
      },
      stderr: {
        on: jest.fn(),
        pipe: jest.fn()
      }
    } as unknown as ChildProcess & { on: jest.Mock };

    // Set up the close event handler
    // @ts-expect-error - Mock implementation uses jest.Mock type
    (mockProcess.on as jest.Mock).mockImplementation((event: string, handler: (code: number) => void) => {
      if (event === 'close') {
        handler(0);
      }
      return mockProcess;
    });

    return mockProcess;
  })
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false)
}));

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockReturnValue(Promise.resolve({
    project_name: 'test-project',
    workflow_name: 'test'
  }))
}));

// Set up test environment
process.env.NODE_ENV = 'test'; 