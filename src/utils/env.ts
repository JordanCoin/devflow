import fs from 'fs';
import dotenv from 'dotenv';
import { Logger } from '../core/logger';

export class EnvLoader {
  static loadEnvFile(path: string): Record<string, string> {
    try {
      const envFile = fs.readFileSync(path, 'utf-8');
      const parsed = dotenv.parse(envFile);
      return parsed as Record<string, string>;
    } catch (error) {
      Logger.error(`Failed to load env file ${path}: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }

  static mergeEnv(...envs: Record<string, string>[]): Record<string, string> {
    return Object.assign({}, ...envs);
  }
} 