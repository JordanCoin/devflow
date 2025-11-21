import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildLLMGuide, generateLLMGuide } from '../../commands/llm';
import { DevFlowConfig } from '../../types';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('llm command', () => {
  let tempDir: string;
  const yamlConfig = `project_name: demo-app
version: 1.0.0
workflows:
  test:
    name: Test Workflow
    description: Run project tests
    tasks:
      - name: Install
        type: command
        command: npm install
      - name: Unit Tests
        type: command
        command: npm test
        depends_on: [Install]
  dockerized:
    name: Docker Workflow
    tasks:
      - name: Start DB
        type: docker
        image: postgres:13
        ports: ['5432:5432']
`;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devflow-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('outputs a JSON guide for LLMs', async () => {
    const configPath = path.join(tempDir, 'devflow.yaml');
    fs.writeFileSync(configPath, yamlConfig);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await generateLLMGuide({ config: configPath, format: 'json' });

    expect(logSpy).toHaveBeenCalled();
    const payload = JSON.parse((logSpy.mock.calls[0] as [string])[0]);
    expect(payload.project.name).toBe('demo-app');
    expect(payload.workflows[0].tasks[1].depends_on).toContain('Install');
    expect(payload.workflows[1].tasks[0].image).toBe('postgres:13');
  });

  it('throws an error when the config file is missing', async () => {
    const missingPath = path.join(tempDir, 'missing.yaml');
    await expect(generateLLMGuide({ config: missingPath })).rejects.toThrow('Configuration file not found');
  });

  it('builds an in-memory guide without reading files', () => {
    const config: DevFlowConfig = {
      project_name: 'memory-app',
      version: '2.0.0',
      workflows: {
        lint: {
          name: 'Lint Workflow',
          description: 'Lint the codebase',
          tasks: [
            { name: 'Lint', type: 'command', command: 'npm run lint', parallel: false }
          ]
        }
      }
    };

    const guide = buildLLMGuide(config);

    expect(guide.project.name).toBe('memory-app');
    expect(guide.workflows[0].tasks[0].command).toBe('npm run lint');
    expect(guide.tips.length).toBeGreaterThan(0);
  });
});
