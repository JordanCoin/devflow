# Contributing to DevFlow

Thank you for your interest in contributing to DevFlow! This document provides guidelines and steps for contributing.

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/devflow.git
   cd devflow
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Make your changes
2. Run tests:
   ```bash
   npm test
   ```
3. Run linting:
   ```bash
   npm run lint
   ```
4. Commit your changes:
   ```bash
   git commit -m "feat: your feature description"
   ```
5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. Create a Pull Request

## Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Write tests for new features
- Update documentation as needed

## Commit Messages

Follow conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for code style changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the documentation if needed
3. Add tests for new features
4. Ensure all tests pass
5. Request review from maintainers

## Testing

- Write unit tests for new features
- Add integration tests for Docker operations
- Ensure all tests pass before submitting PR
- Add test coverage for edge cases

## Documentation

- Update README.md if needed
- Add JSDoc comments for new functions
- Update API documentation
- Add examples for new features

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a new release on GitHub
4. CI/CD will automatically publish to npm

## Questions?

Feel free to open an issue for any questions or concerns.

## License

By contributing, you agree that your contributions will be licensed under the MIT License. 