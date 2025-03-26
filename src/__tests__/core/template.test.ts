import * as fs from 'fs';
import * as path from 'path';
import { TemplateManager } from '../../core/template';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('TemplateManager', () => {
  let templateManager: TemplateManager;
  const mockCwd = '/mock/cwd';
  const mockTemplateDir = path.join(mockCwd, 'src', 'templates');
  
  beforeEach(() => {
    jest.clearAllMocks();
    templateManager = new TemplateManager(mockCwd);
    
    // Default mock implementations
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue({
      size: 100,
      isFile: () => true
    } as fs.Stats);
  });
  
  describe('loadTemplate', () => {
    it('should load a valid template', () => {
      const templatePath = 'workflows/simple.yaml';
      const templateContent = 'name: Simple Workflow\nversion: 1.0.0';
      
      mockedFs.readFileSync.mockReturnValue(templateContent);
      
      const result = templateManager.loadTemplate(templatePath);
      
      expect(result).toBe(templateContent);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        path.join(mockTemplateDir, templatePath),
        'utf-8'
      );
    });
    
    it('should throw an error if template contains dangerous code', () => {
      const templatePath = 'workflows/dangerous.yaml';
      const dangerousContent = 'name: Dangerous\ncode: eval("malicious")';
      
      mockedFs.readFileSync.mockReturnValue(dangerousContent);
      
      expect(() => templateManager.loadTemplate(templatePath)).toThrow(
        'Template contains potentially unsafe code'
      );
    });
    
    it('should throw an error if template does not exist', () => {
      const templatePath = 'workflows/nonexistent.yaml';
      
      mockedFs.existsSync.mockReturnValue(false);
      
      expect(() => templateManager.loadTemplate(templatePath)).toThrow(
        'Template not found'
      );
    });
    
    it('should throw an error if template file is too large', () => {
      const templatePath = 'workflows/large.yaml';
      
      mockedFs.statSync.mockReturnValue({
        size: 2 * 1024 * 1024, // 2MB (over the 1MB limit)
        isFile: () => true
      } as fs.Stats);
      
      expect(() => templateManager.loadTemplate(templatePath)).toThrow(
        'Template file too large'
      );
    });
    
    it('should throw an error for path traversal attempts', () => {
      const templatePath = '../../../etc/passwd';
      
      expect(() => templateManager.loadTemplate(templatePath)).toThrow();
    });
  });
  
  describe('listTemplates', () => {
    it('should list templates in a category', () => {
      const category = 'workflows';
      const templates = [
        { name: 'template1.yaml', isFile: () => true },
        { name: 'template2.yml', isFile: () => true },
        { name: 'README.md', isFile: () => true }
      ] as unknown as fs.Dirent[];
      
      mockedFs.readdirSync.mockReturnValue(templates);
      
      const result = templateManager.listTemplates(category);
      
      expect(result).toEqual(['template1', 'template2']);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith(
        path.join(mockTemplateDir, category)
      );
    });
    
    it('should return an empty array if category does not exist', () => {
      const category = 'nonexistent';
      
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = templateManager.listTemplates(category);
      
      expect(result).toEqual([]);
    });
    
    it('should handle errors gracefully', () => {
      const category = 'workflows';
      
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = templateManager.listTemplates(category);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('loadYamlTemplate', () => {
    it('should load and parse a valid YAML template', () => {
      const templatePath = 'workflows/valid.yaml';
      const templateContent = 'name: Valid\nversion: 1.0.0\ntasks:\n  - name: Task 1\n    command: echo test';
      const expectedParsed = {
        name: 'Valid',
        version: '1.0.0',
        tasks: [
          {
            name: 'Task 1',
            command: 'echo test'
          }
        ]
      };
      
      mockedFs.readFileSync.mockReturnValue(templateContent);
      
      const result = templateManager.loadYamlTemplate(templatePath);
      
      expect(result).toEqual(expectedParsed);
    });
    
    it('should throw an error for invalid YAML', () => {
      const templatePath = 'workflows/invalid.yaml';
      const invalidContent = 'name: Invalid\nversion: 1.0.0\n  tasks:\n  name: Bad Indentation';
      
      mockedFs.readFileSync.mockReturnValue(invalidContent);
      
      expect(() => templateManager.loadYamlTemplate(templatePath)).toThrow(
        'Invalid YAML template'
      );
    });
  });
  
  describe('processTemplate', () => {
    it('should replace variables in the template', () => {
      const template = 'name: {{name}}\nversion: {{version}}\ncommand: {{command}}';
      const variables = {
        name: 'Test Template',
        version: '1.0.0',
        command: 'echo test'
      };
      
      const expected = 'name: Test Template\nversion: 1.0.0\ncommand: echo test';
      
      const result = templateManager.processTemplate(template, variables);
      
      expect(result).toBe(expected);
    });
    
    it('should leave unmatched variables unchanged', () => {
      const template = 'name: {{name}}\nversion: {{version}}\ncommand: {{command}}';
      const variables = {
        name: 'Test Template'
        // Missing version and command
      };
      
      const expected = 'name: Test Template\nversion: {{version}}\ncommand: {{command}}';
      
      const result = templateManager.processTemplate(template, variables);
      
      expect(result).toBe(expected);
    });
    
    it('should handle whitespace in variable names', () => {
      const template = 'name: {{ name }}\nversion: {{  version  }}';
      const variables = {
        name: 'Test Template',
        version: '1.0.0'
      };
      
      const expected = 'name: Test Template\nversion: 1.0.0';
      
      const result = templateManager.processTemplate(template, variables);
      
      expect(result).toBe(expected);
    });
  });
}); 