import { existsSync, writeFileSync, readFileSync } from 'fs';
import { DevFlowConfig } from '../types/config';
import { securePath } from '../utils/security';
import * as logging from '../utils/logging';

export class ConfigManager {
  private readonly configFile: string;
  private readonly baseDir: string;

  constructor() {
    this.baseDir = process.cwd();
    this.configFile = securePath(this.baseDir, 'devflow.yaml');
  }

  exists(): boolean {
    return existsSync(this.configFile);
  }

  async save(config: DevFlowConfig): Promise<void> {
    try {
      const content = JSON.stringify(config, null, 2);
      writeFileSync(this.configFile, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logging.error(`Failed to save configuration: ${message}`);
      throw new Error(`Failed to save configuration: ${message}`);
    }
  }

  async load(): Promise<DevFlowConfig> {
    try {
      const content = readFileSync(this.configFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logging.error(`Failed to load configuration: ${message}`);
      throw new Error(`Failed to load configuration: ${message}`);
    }
  }
} 