export class DevFlowError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestions: string[] = []
  ) {
    super(message);
    this.name = 'DevFlowError';
    Object.setPrototypeOf(this, DevFlowError.prototype);
  }
} 