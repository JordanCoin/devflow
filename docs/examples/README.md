# DevFlow Examples

This directory contains practical examples demonstrating how to use DevFlow in different scenarios.

## Basic Usage Examples

### Simple Test Database Setup

```yaml
# devflow.yaml
project_name: simple-test
version: 1.0.0
workflows:
  test_db:
    name: Test Database
    tasks:
      - name: Start Postgres
        type: docker
        image: postgres:13
        container_name: test-postgres
        env:
          POSTGRES_PASSWORD: test123
          POSTGRES_USER: testuser
          POSTGRES_DB: testdb
        ports:
          - "5432:5432"
        health_check:
          type: tcp
          port: 5432
          retries: 5
          interval: 2000
```

Run with:
```bash
devflow run test_db
```

### Web Application with API and Database

```yaml
# devflow.yaml
project_name: web-api-example
version: 1.0.0
workflows:
  test_env:
    name: Test Environment
    tasks:
      - name: Start Postgres
        type: docker
        image: postgres:13
        container_name: api-postgres
        env:
          POSTGRES_PASSWORD: dev
          POSTGRES_USER: dev
          POSTGRES_DB: api_test
        ports:
          - "5432:5432"
        health_check:
          type: tcp
          port: 5432
          retries: 5
          interval: 2000
          
      - name: Start Redis
        type: docker
        image: redis:6
        container_name: api-redis
        ports:
          - "6379:6379"
        health_check:
          type: tcp
          port: 6379
          
      - name: Start API Server
        type: command
        command: npm run start:api
        env:
          DATABASE_URL: postgresql://dev:dev@localhost:5432/api_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
        wait_for:
          - Start Postgres
          - Start Redis
          
      - name: Run Tests
        type: command
        command: npm test
        wait_for:
          - Start API Server
```

## Advanced Examples

### CI Pipeline Testing

```yaml
# devflow.yaml
project_name: ci-testing
version: 1.0.0
workflows:
  ci:
    name: CI Test Environment
    tasks:
      - name: Start Dependencies
        type: docker-compose
        file: docker-compose.test.yml
        service: dependencies
        health_check:
          type: command
          command: docker-compose ps | grep "dependencies.*healthy"
          retries: 10
          interval: 5000
          
      - name: Build Application
        type: command
        command: npm run build
        
      - name: Run Tests
        type: command
        command: npm test
        wait_for:
          - Start Dependencies
          - Build Application
```

### Integration with External Services

```yaml
# devflow.yaml
project_name: external-integration
version: 1.0.0
workflows:
  payment_test:
    name: Payment Integration Tests
    tasks:
      - name: Start Stripe CLI
        type: command
        command: stripe listen --forward-to http://localhost:4000/webhook
        env:
          STRIPE_API_KEY: ${STRIPE_TEST_KEY}
        background: true
        
      - name: Start ngrok
        type: command
        command: ngrok http 4000
        background: true
        
      - name: Start API
        type: command
        command: npm run start:api
        env:
          PORT: 4000
          STRIPE_SECRET: ${STRIPE_TEST_SECRET}
          
      - name: Run Payment Tests
        type: command
        command: npm run test:payments
        wait_for:
          - Start API
```

## Working with Multiple Environments

You can use environment-specific config files:

```bash
devflow run -c devflow.production.yaml deploy
```

Or use environment variables for flexibility:

```yaml
# devflow.yaml
project_name: multi-env
version: 1.0.0
workflows:
  database:
    name: Database
    tasks:
      - name: Start Database
        type: docker
        image: postgres:13
        container_name: ${ENV:-dev}-postgres
        env:
          POSTGRES_PASSWORD: ${DB_PASSWORD:-dev}
          POSTGRES_USER: ${DB_USER:-dev}
          POSTGRES_DB: ${DB_NAME:-app}
        ports:
          - "${DB_PORT:-5432}:5432"
```

Run with different environments:
```bash
ENV=staging DB_PASSWORD=secret123 devflow run database
``` 