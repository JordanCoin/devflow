import { Task, ServiceHealthCheck } from '../types';

export class TaskError extends Error {
  constructor(
    message: string,
    public readonly task: Task
  ) {
    super(message);
    this.name = 'TaskError';
  }
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly originalError: Error | null
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly check: ServiceHealthCheck
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
} 