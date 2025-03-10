# Getting Started with DevFlow

## Installation

```bash
npm install -g devflow
```

## Quick Start

1. **Initialize a New Project**
```bash
cd your-project
devflow init
```

2. **Create Your First Workflow**
Edit `devflow.yaml`:
```yaml
project_name: my-web-app
version: 1.0.0
workflows:
  test:
    name: Integration Tests
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
      
      - name: Run Tests
        type: command
        command: npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres
```

3. **Run Your Workflow**
```bash
devflow test test
```

## Basic Configuration

### Project Structure
```
your-project/
├── devflow.yaml     # DevFlow configuration
├── .env.local       # Local environment variables (git ignored)
└── src/            # Your source code
```

### Environment Variables
Create `.env.local`:
```
DATABASE_PASSWORD=secret123
API_KEY=your-api-key
```

### Example Workflows

1. **Local Development**
```yaml
workflows:
  dev:
    name: Development Environment
    tasks:
      - name: Start Database
        type: docker
        image: postgres:13
        container_name: dev-db
        env:
          POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      
      - name: Start Redis
        type: docker
        image: redis:6
        container_name: dev-redis
      
      - name: Start Dev Server
        type: command
        command: npm run dev
```

2. **Testing**
```yaml
workflows:
  test:
    name: Test Suite
    tasks:
      - name: Lint
        type: command
        command: npm run lint
      
      - name: Unit Tests
        type: command
        command: npm run test:unit
      
      - name: Integration Tests
        type: command
        command: npm run test:integration
```

## Next Steps

- Check out the [API Reference](./api/README.md) for detailed command documentation
- See [Examples](./examples/README.md) for more workflow configurations
- Review [Error Handling](./errors/README.md) for troubleshooting
- Read [Contributing](../CONTRIBUTING.md) to get involved 