// Set test environment
process.env.NODE_ENV = 'test';

// Increase default timeout for all tests
jest.setTimeout(5000);

// Mock timers by default
jest.useFakeTimers(); 