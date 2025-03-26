import * as fs from 'fs';
import * as logging from './logging';
import { securePath } from './security';

export class EnvLoader {
  static loadEnvFile(path: string): Record<string, string> {
    try {
      // Use secure path validation
      const safePath = securePath(process.cwd(), path);
      const envFile = fs.readFileSync(safePath, 'utf-8');
      return this.parseEnvFile(envFile);
    } catch (error) {
      logging.error(`Failed to load env file ${path}: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }

  static parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }
      
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const trimmedKey = key.trim();
        let trimmedValue = value.trim();
        
        // Handle quoted values
        if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) || 
            (trimmedValue.startsWith('\'') && trimmedValue.endsWith('\''))) {
          trimmedValue = trimmedValue.substring(1, trimmedValue.length - 1);
        }
        
        result[trimmedKey] = trimmedValue;
      }
    }
    
    return result;
  }

  static mergeEnv(...sources: Record<string, string>[]): Record<string, string> {
    return Object.assign({}, ...sources);
  }
} 