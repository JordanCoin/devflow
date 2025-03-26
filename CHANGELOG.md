# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-03-21

### Added
- Improved global installation support
- Monorepo project structure support
- Enhanced environment detection and validation
- Service auto-detection capabilities
- Parallel task execution improvements
- Permission handling and security enhancements
- Workspace management for multiple package managers

### Changed
- Restructured CLI architecture for better error handling
- Updated package configuration for better global usage
- Enhanced environment variable management
- Improved documentation and examples

### Fixed
- Global installation issues
- Permission handling in CLI commands
- Project structure detection
- Environment variable propagation

## [1.0.0] - 2024-03-10

### Added
- Initial release
- Basic workflow execution
- Docker container management
- Environment variable handling
- Automatic resource cleanup
- Health checks for services
- Parallel task execution
- YAML-based configuration
- CLI commands for workflow management

### Features
- `devflow init` - Initialize a new DevFlow project
- `devflow test <workflow>` - Run a workflow
- `devflow clean` - Clean up all resources
- Support for parallel task execution
- Docker container health checks
- Environment variable management
- Automatic resource cleanup

### Technical Details
- TypeScript implementation
- Jest test suite
- ESLint configuration
- GitHub Actions CI/CD
- NPM package publishing

## [Unreleased]

### Planned
- Workflow templates
- Remote execution
- Analytics dashboard
- Plugin system
- Custom task types 