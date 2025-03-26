# DevFlow: CLI Test Environment Automation Tool

[![npm version](https://badge.fury.io/js/devflow.svg)](https://badge.fury.io/js/devflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

DevFlow is an intelligent CLI tool designed to automate testing workflows and environment setup, now with enhanced support for monorepos and complex project structures.

## 🚀 Quick Start

```bash
# Install globally (recommended)
npm install -g @jordanjackson/devflow

# Initialize in your project
cd your-project
devflow init --type monorepo  # or --type single

# Auto-detect services
devflow detect

# Run a workflow
devflow test test_db --env development --parallel
```

## ✨ Features

- 🚀 Intelligent workflow automation
- 🏗️ Monorepo support with workspace management
- 🔍 Automatic service detection
- 🐳 Enhanced Docker integration with health checks
- 🔄 Smart resource cleanup
- 🌍 Advanced environment management
- 📝 Flexible YAML configuration
- ⚡ Parallel task execution
- 🔒 Improved permission handling

## 📖 Project Structure Support

DevFlow now supports various project structures:

```yaml
# devflow.yaml
project:
  type: monorepo  # or 'single'
  packages:
    - name: frontend
      path: ./packages/frontend
      env: [development, test]
    - name: backend
      path: ./packages/backend
      env: [development, test]
  services:
    - type: database
      image: postgres:13
    - type: cache
      image: redis:alpine
```

## 📖 Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api/README.md)
- [TypeScript Types](./docs/types/README.md)
- [Error Handling](./docs/errors/README.md)
- [Examples](./docs/examples/README.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   npm test
   ```

## 📝 Example Configuration

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

## 🗺️ Roadmap

- [ ] Parallel task execution
- [ ] Plugin system
- [ ] Remote execution
- [ ] Analytics dashboard
- [ ] Custom task types
- [ ] Workflow templates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Support

If you find DevFlow helpful, please consider:
- Giving it a star on GitHub ⭐
- Contributing to the project 🤝
- Sharing it with others 📢

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/devflow)
- [GitHub Repository](https://github.com/jordanjackson/devflow)
- [Documentation](./docs)
- [Issue Tracker](https://github.com/jordanjackson/devflow/issues)

## Testing Security Features and GitHub Workflows

Before pushing changes to GitHub, you can test the security features and GitHub workflow configurations locally.

### Dependency Confusion Protection

DevFlow implements several measures to protect against dependency confusion attacks:

1. **Scoped Package Name**: Using `@jordanjackson/devflow` as the package name adds a layer of protection.

2. **Registry Configuration**: The `.npmrc` file explicitly configures registry sources:
   ```
   registry=https://registry.npmjs.org/
   @jordanjackson:registry=https://npm.pkg.github.com/
   ```
   This ensures that packages with your organization's scope only come from your private registry.

3. **Automated Checks**: GitHub workflows verify proper configuration of dependency protection:
   - Validates `.npmrc` configuration
   - Verifies package name scoping
   - Checks for potential namespace conflicts
   - Tests for dependency confusion vulnerabilities

4. **Security Audit**: Run checks for dependency confusion:
   ```bash
   npm run security:check
   ```

For more information about dependency confusion attacks, see [this explanation](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610).

### Testing Security Features

To test the security features implemented in the codebase, run:

```bash
npm run security:test
```

This will test:
- Secure logging and redaction functionality
- Log level control
- Secure command execution
- Log file rotation and cleanup
- Basic security scans

### Testing GitHub Workflows Locally

To test GitHub Actions workflows locally before pushing, we use [act](https://github.com/nektos/act), which runs your GitHub Actions locally in Docker containers.

#### Prerequisites

1. Install Docker and ensure it's running
2. Install act:
   - macOS: `brew install act`
   - Other platforms: Follow [installation instructions](https://github.com/nektos/act#installation)
3. Create a `.env` file from `.env.example` and add your secrets

#### Running Workflow Tests

Run the following command to test your GitHub Actions workflows:

```bash
npm run github:test
```

This will:
1. Detect available workflows
2. Allow you to select which workflow or job to test
3. Run the workflow locally using act
4. Report the results

#### Limitations

When testing locally:
- Some GitHub-specific environment variables may not be available
- Some GitHub Actions features may behave differently
- Network-dependent services might need to be mocked

### Pre-Commit Security Checks

Before committing, you can run a quick security check:

```bash
npm run security:check
```

This checks for:
- Typosquatting in dependencies
- Known malicious packages
- Dependency confusion vulnerabilities
- Package integrity issues

---

<sub>Made with ❤️ by Jordan Jackson</sub> 