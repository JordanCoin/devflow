import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { validateTemplate, securePath } from '../utils/security';
import * as logging from '../utils/logging';

export class TemplateManager {
  private templateDir: string;
  
  constructor(baseDir: string = process.cwd()) {
    this.templateDir = path.join(baseDir, 'src', 'templates');
  }
  
  /**
   * Safely loads a template file, validating it for security issues
   * @param templatePath Path to the template relative to templates directory
   * @returns Template content if valid
   * @throws Error if the template is invalid or contains security issues
   */
  loadTemplate(templatePath: string): string {
    try {
      // Prevent path traversal
      const fullPath = securePath(this.templateDir, templatePath);
      
      // Check file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }
      
      // Limit file size to prevent DOS
      const stats = fs.statSync(fullPath);
      const maxSize = 1024 * 1024; // 1MB limit
      if (stats.size > maxSize) {
        throw new Error(`Template file too large (max ${maxSize} bytes): ${templatePath}`);
      }
      
      // Read the file content
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Validate template content for security issues
      if (!validateTemplate(content)) {
        throw new Error(`Template contains potentially unsafe code: ${templatePath}`);
      }
      
      return content;
    } catch (error) {
      logging.error(`Template loading error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Lists templates in a category
   * @param category Template category to list
   * @returns Array of template names without extensions
   */
  listTemplates(category: string): string[] {
    try {
      const categoryPath = path.join(this.templateDir, category);
      
      if (!fs.existsSync(categoryPath)) {
        return [];
      }
      
      const files = fs.readdirSync(categoryPath) as (string | fs.Dirent)[];
      
      return files
        .filter(file => {
          // Handle both string and Dirent objects
          const fileName = typeof file === 'string' ? file : file.name;
          return fileName.endsWith('.yaml') || fileName.endsWith('.yml');
        })
        .map(file => {
          // Handle both string and Dirent objects
          const fileName = typeof file === 'string' ? file : file.name;
          return path.basename(fileName, path.extname(fileName));
        });
    } catch (error) {
      logging.error(`Template listing error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Safely loads and parses a YAML template
   * @param templatePath Path to the template relative to templates directory
   * @returns Parsed YAML object
   */
  loadYamlTemplate<T>(templatePath: string): T {
    const content = this.loadTemplate(templatePath);
    try {
      return yaml.parse(content) as T;
    } catch (error) {
      logging.error(`Template parsing error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Invalid YAML template: ${templatePath}`);
    }
  }
  
  /**
   * Processes a template with variables
   * @param template Template content
   * @param variables Variables to replace in the template
   * @returns Processed template with variables replaced
   */
  processTemplate(template: string, variables: Record<string, string>): string {
    // Simple variable replacement using {{variable}} syntax
    // No eval or complex processing to avoid security issues
    return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim();
      return variables[trimmedName] || match;
    });
  }
} 