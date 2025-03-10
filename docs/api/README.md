# DevFlow API Reference

## CLI Commands

### `devflow init`
Initializes a new DevFlow project in the current directory.

```bash
devflow init [options]
```

### `devflow test <workflow>`
Executes a defined workflow.

```bash
devflow test <workflow> [options]

Options:
  -c, --config <path>     Path to config file
  -d, --dry-run          Show what would be executed without running it
  -e, --env <key=value>  Set environment variables
  --debug                Enable debug logging
```

### `devflow clean`
Cleans up all DevFlow managed resources.

```bash
devflow clean [options]

Options:
  -f, --force  Skip confirmation prompt
```

## Configuration Schema

DevFlow uses YAML for configuration. Here's the core schema:

```yaml
# devflow.yaml
project_name: string           # Required: Name of your project
version: string               # Required: Project version
workflows:                    # Required: Map of workflow definitions
  workflow_name:             # Key: Name of the workflow
    name: string            # Required: Display name
    description: string     # Optional: Workflow description
    tasks:                 # Required: Array of tasks to execute
      - name: string      # Required: Task name
        type: string      # Required: 'command' or 'docker'
        command: string   # Required for type: 'command'
        image: string     # Required for type: 'docker'
        container_name: string  # Optional: Docker container name
        env:              # Optional: Environment variables
          KEY: value
        health_check:     # Optional: Health check configuration
          type: string   # 'tcp' or 'http'
          host: string
          port: number
          path: string   # Required for http health checks
          retries: number
          interval: number
          timeout: number
```

## Task Types

### Command Task
Executes a shell command.

```yaml
tasks:
  - name: Run Tests
    type: command
    command: npm test
    env:
      NODE_ENV: test
```

### Docker Task
Manages Docker containers.

```yaml
tasks:
  - name: Start Database
    type: docker
    image: postgres:13
    container_name: test-db
    env:
      POSTGRES_PASSWORD: test
    health_check:
      type: tcp
      host: localhost
      port: 5432
      retries: 5
      interval: 2000
      timeout: 10000
```

## Environment Variables

DevFlow supports environment variables through:
1. Configuration file
2. Command line arguments
3. .env files
4. System environment

Priority order (highest to lowest):
1. Command line arguments
2. Task-specific environment variables
3. .env file variables
4. System environment variables 