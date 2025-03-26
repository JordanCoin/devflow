import * as logging from '../../utils/logging';

describe('Logging Utils', () => {
  let originalConsole: any;
  
  beforeEach(() => {
    // Save original console methods
    originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };
    
    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });
  
  afterEach(() => {
    // Restore original console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });
  
  describe('sanitizeLogsForSecrets', () => {
    it('should redact password values', () => {
      const testCases = [
        {
          input: 'password=secret123',
          expected: 'password=[REDACTED]'
        },
        {
          input: 'Setting password: myStrongPassword123!',
          expected: 'Setting password=[REDACTED]'
        },
        {
          input: 'DB_PASSWORD=complex-password',
          expected: 'DB_PASSWORD=[REDACTED]'
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(logging.sanitizeLogsForSecrets(input)).toBe(expected);
      });
    });
    
    it('should redact token values', () => {
      const testCases = [
        {
          input: 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          expected: 'token=[REDACTED]'
        },
        {
          input: 'API_TOKEN: a8s7d6f5g4h3j2k1l',
          expected: 'API_TOKEN=[REDACTED]'
        },
        {
          input: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0',
          expected: 'Bearer [REDACTED]'
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(logging.sanitizeLogsForSecrets(input)).toBe(expected);
      });
    });
    
    it('should redact various secret types', () => {
      const testCases = [
        {
          input: 'secret=shhh-dont-tell',
          expected: 'secret=[REDACTED]'
        },
        {
          input: 'api_key=a8s7d6f5g4h3j2k1l',
          expected: 'api_key=[REDACTED]'
        },
        {
          input: 'auth=Basic dXNlcjpwYXNz',
          expected: 'auth=[REDACTED]'
        },
        {
          input: 'Setting cred=sensitive-data',
          expected: 'Setting cred=[REDACTED]'
        },
        {
          input: 'credential=secret-credential',
          expected: 'credential=[REDACTED]'
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(logging.sanitizeLogsForSecrets(input)).toBe(expected);
      });
    });
    
    it('should handle multiple secrets in a single string', () => {
      const input = 'password=secret token=abc123 api_key=xyz789';
      const expected = 'password=[REDACTED] token=[REDACTED] api_key=[REDACTED]';
      
      expect(logging.sanitizeLogsForSecrets(input)).toBe(expected);
    });
    
    it('should not modify strings without secrets', () => {
      const testCases = [
        'Normal log message',
        'User logged in successfully',
        'Operation completed in 500ms'
      ];
      
      testCases.forEach(input => {
        expect(logging.sanitizeLogsForSecrets(input)).toBe(input);
      });
    });
  });
  
  describe('log level functions', () => {
    beforeEach(() => {
      // Set log level to trace to allow all levels
      logging.setLogLevel('trace');
    });
    
    it('error should sanitize messages', () => {
      logging.error('password=secret123');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('password=[REDACTED]'));
    });
    
    it('warn should sanitize messages', () => {
      logging.warn('token=abc123');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('token=[REDACTED]'));
    });
    
    it('info should sanitize messages', () => {
      logging.info('api_key=xyz789');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('api_key=[REDACTED]'));
    });
    
    it('debug should sanitize messages and data', () => {
      logging.debug('Debug with secret=value', { password: 'secret123' });
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('secret=[REDACTED]'));
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('"password": "[REDACTED]"'));
    });
    
    it('trace should sanitize messages and data', () => {
      logging.trace('Trace with token=abc123', { api_key: 'xyz789' });
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('token=[REDACTED]'));
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('"api_key": "[REDACTED]"'));
    });
  });
  
  describe('log level control', () => {
    it('should not log messages below the current level', () => {
      logging.setLogLevel('warn');
      
      logging.error('Error message');
      logging.warn('Warning message');
      logging.info('Info message');
      logging.debug('Debug message');
      
      expect(console.error).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });
    
    it('should log all messages at or above the current level', () => {
      logging.setLogLevel('debug');
      
      logging.error('Error message');
      logging.warn('Warning message');
      logging.info('Info message');
      logging.debug('Debug message');
      logging.trace('Trace message');
      
      expect(console.error).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.debug).toHaveBeenCalledTimes(2); // debug + trace
    });
  });
}); 