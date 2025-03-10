# DevFlow: CLI Test Environment Automation Tool

[![npm version](https://badge.fury.io/js/devflow.svg)](https://badge.fury.io/js/devflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

DevFlow is a command-line tool designed for solo developers to automate testing workflows and environment setup. It streamlines repetitive development tasks through simple commands, eliminating manual configuration.

## 🚀 Quick Start

```bash
# Install globally
npm install -g devflow

# Initialize in your project
cd your-project
devflow init

# Run a workflow
devflow test test_db
```

## ✨ Features

- 🚀 Simple workflow automation
- 🐳 Docker integration with health checks
- 🔄 Automatic cleanup of resources
- 🌍 Environment variable management
- 📝 YAML-based configuration
- ⚡ Sequential task execution

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

---

<sub>Made with ❤️ by Jordan Jackson</sub> 