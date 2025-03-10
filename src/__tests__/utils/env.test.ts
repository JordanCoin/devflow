import { EnvLoader } from '../../utils/env';
import { readFileSync } from 'fs';

jest.mock('fs');

describe('EnvLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadEnvFile', () => {
    it('should load and parse environment variables from file', () => {
      const mockContent = `
        # Comment
        KEY1=value1
        KEY2="quoted value"
        KEY3='single quoted'
        EMPTY_LINES=

        KEY4=value=with=equals
      `;
      (readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = EnvLoader.loadEnvFile('.env');

      expect(result).toEqual({
        KEY1: 'value1',
        KEY2: 'quoted value',
        KEY3: 'single quoted',
        EMPTY_LINES: '',
        KEY4: 'value=with=equals'
      });
    });

    it('should handle file read errors gracefully', () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = EnvLoader.loadEnvFile('non-existent.env');

      expect(result).toEqual({});
    });
  });

  describe('mergeEnv', () => {
    it('should merge multiple environment objects', () => {
      const env1 = { KEY1: 'value1', SHARED: 'first' };
      const env2 = { KEY2: 'value2', SHARED: 'second' };
      const env3 = { KEY3: 'value3', SHARED: 'third' };

      const result = EnvLoader.mergeEnv(env1, env2, env3);

      expect(result).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3',
        SHARED: 'third'  // Last one wins
      });
    });

    it('should handle empty objects', () => {
      const result = EnvLoader.mergeEnv({}, { KEY: 'value' }, {});

      expect(result).toEqual({
        KEY: 'value'
      });
    });
  });
}); 