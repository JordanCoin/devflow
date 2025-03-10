import { readFileSync } from 'fs';
import { join } from 'path';
import { DevFlowConfig } from '../types/config';

export class TemplateManager {
  private readonly templateDir: string;

  constructor() {
    this.templateDir = join(__dirname, '../../templates/workflows');
  }

  async loadTemplate(templatePath: string): Promise<DevFlowConfig> {
    try {
      const fullPath = join(this.templateDir, templatePath);
      const content = readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load template: ${message}`);
    }
  }
} 