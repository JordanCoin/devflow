import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { DevFlowConfig } from '../types/config';

export class ConfigManager {
  private readonly configFile: string;

  constructor() {
    this.configFile = join(process.cwd(), 'devflow.yaml');
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
      throw new Error(`Failed to save configuration: ${message}`);
    }
  }

  async load(): Promise<DevFlowConfig> {
    try {
      const content = readFileSync(this.configFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load configuration: ${message}`);
    }
  }
} 