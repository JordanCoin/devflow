import { jest } from '@jest/globals';
import { ChildProcess } from 'child_process';

type MockContainer = {
  id: string;
  start: jest.Mock;
  stop: jest.Mock;
  remove: jest.Mock;
  inspect: jest.Mock;
  logs: jest.Mock;
  modem: Record<string, never>;
  rename: jest.Mock;
  update: jest.Mock;
  top: jest.Mock;
  exec: jest.Mock;
  commit: jest.Mock;
  cp: jest.Mock;
  diff: jest.Mock;
  export: jest.Mock;
  getArchive: jest.Mock;
  putArchive: jest.Mock;
  pause: jest.Mock;
  unpause: jest.Mock;
  resize: jest.Mock;
  attach: jest.Mock;
  wait: jest.Mock;
  kill: jest.Mock;
  restart: jest.Mock;
  stats: jest.Mock;
  changes: jest.Mock;
};

// TODO(jordanjackson): Fix type system issues with Docker mocks
// There are currently type incompatibilities between the mock implementation
// and the dockerode type definitions. This needs to be addressed in a future update.
// Related to the ContainerInspectInfo type from dockerode.
// For now, the implementation works correctly but TypeScript is showing errors.

// Mock Docker
jest.mock('dockerode', () => {
  const mockContainer: MockContainer = {
    id: 'test-container-id',
    start: jest.fn().mockReturnValue(Promise.resolve()),
    stop: jest.fn().mockReturnValue(Promise.resolve()),
    remove: jest.fn().mockReturnValue(Promise.resolve()),
    // @ts-expect-error: Type system issue with dockerode mock
    inspect: jest.fn().mockResolvedValue({
      Id: 'test-container-id',
      Name: '/test-container',
      State: {
        Running: true,
        Status: 'running',
        Pid: 1234
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
  };

  const MockDocker = jest.fn().mockImplementation(() => ({
    getContainer: jest.fn().mockReturnValue(mockContainer),
    pull: jest.fn().mockReturnValue(Promise.resolve()),
    createContainer: jest.fn().mockReturnValue(Promise.resolve(mockContainer))
  }));

  return MockDocker;
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