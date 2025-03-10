# TypeScript Types Reference

## Core Types

### Task Types
```typescript
type TaskType = 'command' | 'docker';

interface Task {
  name: string;           // Required: Task name
  type: TaskType;         // Required: 'command' or 'docker'
  command?: string;       // Required for type: 'command'
  image?: string;         // Required for type: 'docker'
  container_name?: string;// Optional: Docker container name
  env?: Record<string, string>; // Optional: Environment variables
  health_check?: HealthCheck;   // Optional: Health check config
  depends_on?: string[];        // Optional: Task dependencies
  parallel?: boolean;           // Optional: Run in parallel
}
```

### Workflow Types
```typescript
interface Workflow {
  name: string;           // Required: Display name
  description?: string;   // Optional: Workflow description
  tasks: Task[];         // Required: Array of tasks
}

interface DevFlowConfig {
  project_name: string;   // Required: Project name
  version: string;       // Required: Project version
  workflows: Record<string, Workflow>; // Required: Workflow definitions
}
```

## Docker Types

### Health Check Configuration
```typescript
interface HealthCheck {
  type: 'tcp' | 'http';  // Health check type
  host: string;          // Host to check
  port: number;          // Port to check
  path?: string;         // Required for http checks
  retries: number;       // Number of retry attempts
  interval: number;      // Interval between retries (ms)
  timeout: number;       // Timeout for each check (ms)
}
```

### Docker Logging
```typescript
interface LogOptions {
  follow?: boolean;      // Stream logs
  timestamps?: boolean;  // Include timestamps
  tail?: number;        // Number of lines to show
  filter?: string;      // Log filter
}
```

## Utility Types

### Configuration Management
```typescript
interface ConfigLoader {
  load(configPath: string): DevFlowConfig;
  validateConfig(config: DevFlowConfig): void;
}
```

### Task Execution
```typescript
interface TaskExecutor {
  executeTask(task: Task): Promise<void>;
  executeWorkflow(workflow: Workflow): Promise<void>;
}
```

### Error Handling
```typescript
interface DevFlowError extends Error {
  code: string;          // Error code
  details?: unknown;     // Additional error details
}
```

## Type Guards

```typescript
function isDockerTask(task: Task): boolean {
  return task.type === 'docker';
}

function isCommandTask(task: Task): boolean {
  return task.type === 'command';
}
```

## Usage Examples

### Creating a Task
```typescript
const dbTask: Task = {
  name: 'Start Database',
  type: 'docker',
  image: 'postgres:13',
  container_name: 'test-db',
  env: {
    POSTGRES_PASSWORD: 'test'
  },
  health_check: {
    type: 'tcp',
    host: 'localhost',
    port: 5432,
    retries: 5,
    interval: 2000,
    timeout: 10000
  }
};
```

### Defining a Workflow
```typescript
const testWorkflow: Workflow = {
  name: 'Integration Tests',
  description: 'Run integration tests with database',
  tasks: [dbTask, {
    name: 'Run Tests',
    type: 'command',
    command: 'npm test',
    depends_on: ['Start Database']
  }]
};
```

### Complete Configuration
```typescript
const config: DevFlowConfig = {
  project_name: 'my-web-app',
  version: '1.0.0',
  workflows: {
    test: testWorkflow
  }
};
``` 