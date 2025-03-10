# DevFlow: CLI Test Environment Automation Tool

## Overview

DevFlow is a weekend project to create a simple yet powerful CLI tool for solo developers to automate testing workflows and environment setup. It focuses on doing one thing well: running predefined sequences of commands and Docker containers with minimal configuration.

## Quick Start (3 Steps)

```bash
# 1. Install DevFlow globally
npm install -g devflow

# 2. Initialize in your project
cd my-project
devflow init

# 3. Run your first workflow
devflow test local_dev
```

That's it! DevFlow will handle the rest - spinning up containers, running commands, and cleaning up afterwards.

### Environment Variables & Secrets

DevFlow provides several ways to handle environment variables and secrets:

1. **Config File** (for non-sensitive data):

```yaml
workflows:
  test:
    tasks:
      - name: Run Tests
        type: command
        env:
          NODE_ENV: test
          DB_PORT: 5432
```

2. **Local .env Files** (for secrets):

```bash
# .env.local (git ignored)
DB_PASSWORD=secret123
API_KEY=your-api-key

# In your workflow
tasks:
  - name: Start Database
    type: docker
    env_file: .env.local  # DevFlow will load these automatically
```

3. **System Environment** (for CI/CD):

```bash
# Your CI pipeline
export DB_PASSWORD=secret123
devflow test integration  # DevFlow inherits system env vars
```

⚠️ **Security Note**: Never commit sensitive data in your workflow YAML files. Use `.env.local` or system environment variables instead.

### Why DevFlow?

Solo developers often juggle multiple terminal windows to:

- Start local test databases
- Run test suites
- Clean up environments
DevFlow reduces these tasks to a single command through a simple YAML config file.

## Real-World Scenarios

### 1. Full-Stack Testing (React + Node.js + PostgreSQL)

```bash
# DevFlow configuration
workflows:
  integration_test:
    name: Integration Tests
    tasks:
      - name: Start Database
        type: docker
        image: postgres:13
        container_name: test-db
        env:
          POSTGRES_PASSWORD: test123
          POSTGRES_DB: testdb
      
      - name: Start Backend
        type: command
        command: npm run start:backend
      
      - name: Run Frontend Tests
        type: command
        command: npm run test:e2e

# CLI Usage
$ devflow test integration_test
[INFO] Starting Postgres container (test-db)...
[SUCCESS] Database ready on port 5432
[INFO] Starting backend server...
[SUCCESS] Server running on port 3000
[INFO] Running frontend E2E tests...
[SUCCESS] All tests passed
[INFO] Cleaning up...
[SUCCESS] Workflow completed in 45s
```

### 2. Microservices Development

```bash
# DevFlow configuration
workflows:
  local_dev:
    name: Local Development Setup
    tasks:
      - name: Start Redis
        type: docker
        image: redis:6
        container_name: cache
      
      - name: Start Auth Service
        type: docker
        image: auth-service:local
        container_name: auth
        env:
          REDIS_HOST: cache
      
      - name: Start API Gateway
        type: command
        command: npm run dev:gateway

# CLI Usage
$ devflow test local_dev
[INFO] Starting Redis container...
[SUCCESS] Redis ready on port 6379
[INFO] Starting Auth Service...
[SUCCESS] Auth Service ready on port 8080
[INFO] Starting API Gateway...
[SUCCESS] Gateway running on port 3000
[INFO] Development environment ready!
```

### 3. CI Pipeline Simulation

```bash
# DevFlow configuration
workflows:
  ci_simulation:
    name: CI Pipeline Local Test
    tasks:
      - name: Lint
        type: command
        command: npm run lint
      
      - name: Unit Tests
        type: command
        command: npm run test:unit
      
      - name: Build Docker Image
        type: command
        command: docker build -t myapp:test .

# CLI Usage
$ devflow test ci_simulation
[INFO] Running linter...
[SUCCESS] No linting errors found
[INFO] Running unit tests...
[SUCCESS] All tests passed
[INFO] Building Docker image...
[SUCCESS] Image myapp:test built successfully
```

## Critical Edge Cases & Solutions

### 1. Resource Cleanup on Failure

```bash
$ devflow test integration_test
[INFO] Starting Postgres container...
[ERROR] Port 5432 already in use
[INFO] Rolling back... Cleaning up resources
[SUCCESS] All containers removed
[ERROR] Workflow failed: Port conflict
```

**Solution:**

- Register cleanup handlers for each resource
- Maintain resource creation order for proper rollback
- Log all cleanup steps for debugging

### 2. Network Dependencies

```bash
$ devflow test local_dev
[INFO] Starting Redis...
[SUCCESS] Redis ready
[INFO] Starting Auth Service...
[ERROR] Cannot connect to Redis
[INFO] Retrying (1/3)...
[SUCCESS] Connected on second attempt
```

**Solution:**

- Implement retry mechanisms with backoff
- Health checks for service dependencies
- Clear error messages showing dependency chain

### 3. Process Management

```bash
$ devflow test integration_test
[INFO] Starting backend server...
[SUCCESS] Server running
^C
[INFO] Interrupt received
[INFO] Stopping backend server...
[INFO] Removing database container...
[SUCCESS] Clean shutdown completed
```

**Solution:**

- Proper signal handling (SIGINT, SIGTERM)
- Process tree management for child processes
- Graceful shutdown procedures

## Common User Journeys

### Local Development Setup

1. **Initial Setup**

```bash
$ devflow init
[INFO] Creating new DevFlow configuration
? Project name: my-fullstack-app
? Default workflow: local_dev
[SUCCESS] Configuration created

$ devflow test local_dev
[INFO] Starting development environment...
```

2. **Daily Development**

```bash
# Morning setup
$ devflow test local_dev
[SUCCESS] Environment ready in 15s

# After code changes
$ devflow test integration_test
[SUCCESS] All tests passed

# End of day
$ devflow clean
[SUCCESS] All resources cleaned up
```

### Debugging Sessions

```bash
# Start with debug logging
$ devflow test local_dev --log-level debug
[DEBUG] Checking Docker daemon...
[DEBUG] Loading configuration...
[DEBUG] Validating network availability...
[INFO] Starting services...

# Check service logs
$ devflow logs auth-service
[INFO] Streaming logs for auth-service...
```

## Weekend Ship Scope (MVP)

### Day 1

- Basic CLI structure
- Config file parsing (YAML)
- Two core commands: init and test
- Simple task executor (sequential only)

### Day 2

- Basic Docker integration
- Error handling
- Documentation
- npm package publish

## Core Principles

- **Simplicity First**: Easy to install, configure, and use
- **Do One Thing Well**: Focus on sequential task execution
- **Developer Experience**: Clear error messages and logs
- **Local First**: Run everything locally without external dependencies

## Simplified File Structure

```
devflow/
├── src/
│   ├── index.ts              # Entry point
│   ├── commands/
│   │   ├── init.ts          # Project initialization
│   │   └── test.ts          # Test execution
│   ├── config/
│   │   └── loader.ts        # Config management
│   ├── core/
│   │   ├── executor.ts      # Task execution
│   │   └── logger.ts        # Logging utilities
│   └── types/               # TypeScript definitions
└── templates/
    └── config.yaml.template # Base configuration
```

## MVP Features

### 1. Configuration Schema

```typescript
export type TaskType = 'command' | 'docker';

export interface Task {
  name: string;
  type: TaskType;
  command?: string;
  image?: string;
  container_name?: string;
  env?: Record<string, string>;
}

export interface Workflow {
  name: string;
  description?: string;
  tasks: Task[];
}

export interface DevFlowConfig {
  project_name: string;
  version: string;
  workflows: Record<string, Workflow>;
}
```

### 2. Core Components

- **Task Executor**: Runs tasks sequentially
- **Config Manager**: Loads and validates YAML
- **Logger**: Simple color-coded output
- **Docker Integration**: Basic container start/stop

### Example Usage

```bash
# Initialize a new project
devflow init

# Run a test workflow
devflow test

# Sample CLI output
[INFO] Starting Postgres container (test-db)...
[SUCCESS] Container started on port 5432
[INFO] Running tests...
[SUCCESS] Tests completed
[INFO] Cleaning up...
```

### Example Configuration

```yaml
project_name: my-web-app
version: 1.0
workflows:
  test:
    name: Test
    description: Run tests with database
    tasks:
      - name: Start Database
        type: docker
        image: postgres:13
        container_name: test-db
        env:
          POSTGRES_PASSWORD: test
      
      - name: Run Tests
        type: command
        command: npm test
```

## Out of Scope for MVP

- Parallel task execution
- Plugin system
- Remote execution
- Analytics
- Complex Docker networking
- Shared workflows
- CI/CD integration

## Weekend Ship Checklist

- [ ] CLI accepts basic commands
- [ ] Can parse YAML config
- [ ] Can run sequential tasks
- [ ] Basic Docker container management
- [ ] Error handling for common failures
- [ ] Simple documentation
- [ ] Published to npm

## Error Handling Strategy

1. Clear error messages for common issues:
   - Missing Docker
   - Invalid YAML
   - Failed commands
2. Graceful cleanup on failure
3. Detailed logging for debugging

## Documentation Needs

1. README.md with:
   - Quick start guide
   - Installation steps
   - Basic configuration example
2. TypeScript types documentation
3. Common error solutions

## Future Vision

### 1. Open Source Core (Free Forever)

- Local CLI tool
- Basic workflow automation
- Docker integration
- Community plugins

### 2. Cloud Features (Future Pro Plan)

- Remote environment orchestration
- Team workflow sharing
- Analytics dashboard
- Parallel task execution
- Custom runtime environments

### 3. Enterprise Features (Future)

- SSO integration
- Audit logging
- Custom plugin marketplace
- Priority support

### Extensibility

DevFlow is designed for extensibility from day one:

1. **Plugin System**

```typescript
// Future plugin API (coming soon)
interface DevFlowPlugin {
  name: string;
  commands: Command[];
  hooks: {
    beforeTask?: (task: Task) => Promise<void>;
    afterTask?: (task: Task) => Promise<void>;
  };
}
```

2. **Custom Task Types**

```yaml
# Example of future custom task type
workflows:
  deploy:
    tasks:
      - name: Deploy to AWS
        type: aws-lambda  # Custom task type from plugin
        function: my-function
        region: us-east-1
```

3. **Workflow Templates**
Share and import workflow templates from the community:

```bash
devflow import workflow github:user/devflow-aws-templates
```

## Source Code

- GitHub: [github.com/your-username/devflow](https://github.com/your-username/devflow)
- NPM: [npm/package/devflow](https://www.npmjs.com/package/devflow)
- Documentation: [devflow.dev](https://devflow.dev) (coming soon)

## How to Use These Documents

1. **Start by creating a new project folder** and placing the markdown file inside it as `PROJECT_DOCS.md`

2. **Set up the initial project structure** following the file structure outlined in the documentation:

   ```bash
   mkdir -p devflow/src/{cli/{commands,prompts},config,core,utils,types} devflow/bin devflow/templates/workflows

   
3. Use Cursor with Claude to start implementing components:

Begin with package.json, tsconfig.json, and the core type definitions
Implement the config loader and schema first
Move on to the task executor
Implement the CLI commands one by one

4. When asking Claude for help, reference the documentation:

Based on the DevFlow documentation I've created, I'm now implementing the task executor. Here's my current challenge: [describe problem]

Based on the DevFlow documentation I've created, I'm now implementing the task executor. Here's my current challenge: [describe problem]

Work iteratively, validating each component works before moving to the next. For example:

First get the config parsing working
Then implement a simple executor that can run command tasks
Add the init command
Test the workflow with a basic example

Below is some feedback and ideas on how to enhance your "project overview" file. Overall, it already covers a lot of ground: architecture, file structure, roadmap, and guiding principles are well-outlined. Here are ways you could strengthen it:

---

## 1. Clarify the Why (Use Cases / Problem Statement)

**Why would a solo dev need DevFlow?**  

- Add a short paragraph describing typical DevOps pain points for solo developers, and how DevFlow specifically tackles them. For example:

> "Solo devs often juggle setting up local test databases, running builds, and cleaning environments before deployments. DevFlow automates this process with a single CLI command, saving time and preventing 'works on my machine' issues."

This reminds readers (and Cursor/Claude) of the overarching goal: reduce repetitive friction in a developer's workflow.

---

## 2. Expand on Usage Examples

You have a good example config file, but consider adding **brief usage demos**. For instance:

```bash
# Example usage
devflow init           # Guides the user to create or update a config
devflow run test       # Executes all tasks in the "test" workflow
devflow run deploy_staging --env production
```

Then show how the CLI output might look (a short snippet). This helps clarify the final user experience.

---

## 3. Incorporate Edge Cases & Error Handling

You mention fail_fast, parallel tasks, and Docker environment. It might be useful to list the **top edge cases** the MVP should handle, for example:

1. **If Docker is not installed** or the version is outdated.  
2. **Network conflicts** when spinning up containers.  
3. **Timeouts** for tasks that hang.  
4. **Parallel tasks** that conflict or produce collisions on ports.  

Consider adding a small note under "Implementation Phases" or "Core Components" specifying how you plan to gracefully handle these (like logging, exit codes, or retries).

---

## 4. Future Plans: "Open-Core" or "Plugins" Quick Note

You mention a plugin system in Phase 2. It can help to outline a quick bullet on **how** you envision it. E.g., a plugin folder or a registerPlugin() method that picks up custom commands at runtime. This sets a direction for Cursor/Claude about how to structure the code to be extensible.

---

## 5. Marketing & Monetization Summary

You refer to a "potential future commercialization" in the mission, but adding a short bullet list in the doc about marketing ideas or possible pricing approaches helps keep that in scope. Something like:

> **Monetization Considerations**  
>
> - **Freemium**: Free local CLI, paid cloud features.  
> - **Enterprise Tier**: Multi-user / shared workflows.  
> - **Plugin Marketplace**: Possibly in the long run.

Even just a paragraph sets the stage for future expansions.

---

## 6. Validate Real-World Workflow (Mini Use Case)

Consider adding a **mini user story**:

"Alex, a solo dev working on a Node.js web app, needs to run a local Postgres container for integration tests, clean up after, and deploy to a staging environment. With DevFlow, Alex configures a single workflow in `config.yaml` and runs \`devflow run test_db\` before each push. DevFlow automatically starts a container, runs integration tests, stops the container, and provides a final log summary."

This helps illustrate the real benefits so future contributors (or even your own future self) see exactly how everything ties together.

---

### Example Additions (Partial)

Here's how you might embed some of these enhancements in your document, in condensed form:

```markdown
# DevFlow: CLI Test Environment Automation Tool

## Overview
DevFlow is a command-line tool designed for solo developers to automate testing workflows and environment setup. It streamlines repetitive development tasks through simple commands, eliminating manual configuration.

### Why DevFlow?
Solo devs often juggle spinning up local test databases, installing dependencies, running integration tests, and cleaning up containers before deploying. DevFlow reduces these tasks to a single command in a YAML-defined workflow. By automating repetitive steps, DevFlow saves time, avoids "works on my machine" pitfalls, and provides a consistent developer experience.

### Quick Usage Example
```bash
# Basic usage
devflow init                # Interactive setup to create or update config
devflow run test            # Runs all tasks in the "test" workflow
devflow run deploy_staging  # Deploys to staging based on config tasks
```

Below is a sample CLI output when running `devflow run test_db`:

```
[INFO] Starting Postgres container (test-db)...
[SUCCESS] Container started on port 5432
[INFO] Running DB integration tests...
[SUCCESS] Tests completed in 12s
[INFO] Stopping container...
[SUCCESS] Container test-db removed
```

## Core Principles

(Same as before)

## File Structure

(Same as before)

## Key Components

(Same as before)
...

## Edge Cases & Error Handling

- Docker not installed or older version
- Network conflicts when parallel containers run
- Task timeouts (fail gracefully)
- Container naming collisions

## Example Configuration File

(As before)

## Implementation Phases

- Phase 1: MVP (Basic commands, Docker integration)
- Phase 2: Enhanced features (Parallel tasks, plugin system)
- Phase 3: Advanced features (Remote execution, analytics, CI/CD integration)
...

## Possible Future Monetization

- Freemium approach with local CLI free, paid cloud-based logs or analytics
- Enterprise tier with multi-user workflows, SSO, advanced container orchestration
- Plugin marketplace for specialized workflows

## Sample User Story

Alex is a solo dev on a Node.js project. She runs `npm install`, `docker run`, `npm test`, and `docker stop` multiple times a day. With DevFlow, she defines a "test_db" workflow that spins up a Postgres container, runs tests, and cleans up automatically. She saves ~10 minutes of repetitive effort daily and reduces mistakes by automating these steps.

```

This kind of **use-case-driven detail** and **practical examples** makes your document more reference-friendly and helps ChatGPT/Cursor/Claude produce more contextually accurate code.

---

## Summary
You already have a solid blueprint. The main opportunities for enhancement are:

1. **Explain the "why"** (use cases, pain points)  
2. **Show real CLI usage** and example output  
3. **List major edge cases** and plan for them  
4. **Mention plugin architecture** or monetization if relevant  
5. **Include a short user story** to illustrate real-world flow

Incorporating these will make your project overview more actionable and compelling for both you and any AI or collaborators who reference it.
