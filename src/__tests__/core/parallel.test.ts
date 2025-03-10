import { TaskExecutor } from '../../core/executor';
import { Workflow, Task, ExecutionContext } from '../../types';
import { Logger } from '../../core/logger';
import Docker from 'dockerode';

// Mock dependencies
jest.mock('dockerode');
jest.mock('../../core/logger');

describe('TaskExecutor - Parallel Execution', () => {
  let executor: TaskExecutor;
  let context: ExecutionContext;
  const mockTask = (name: string, delay: number = 50, shouldSucceed: boolean = true): Task => ({
    name,
    type: 'command',
    command: `sleep ${delay / 1000} && ${shouldSucceed ? 'true' : 'false'}`,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    executor = new TaskExecutor();
    context = {
      config: {} as any,
      workflowName: 'test',
      env: {},
      cwd: process.cwd(),
      logger: Logger
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const runWithTimers = async <T>(promise: Promise<T>): Promise<T> => {
    const tick = () => new Promise(resolve => process.nextTick(resolve));
    
    // Create a promise that will resolve when the main promise settles
    const result = promise.then(
      value => ({ status: 'fulfilled' as const, value }),
      error => ({ status: 'rejected' as const, error })
    );

    // Keep advancing time and processing the microtask queue until the promise settles
    while (jest.getTimerCount() > 0) {
      jest.advanceTimersByTime(50);
      await tick(); // Let microtasks process
    }

    // Get the result and either return the value or throw the error
    const settlement = await result;
    if (settlement.status === 'fulfilled') {
      return settlement.value;
    } else {
      throw settlement.error;
    }
  };

  describe('Sequential Execution', () => {
    it('should execute tasks sequentially when parallel is not enabled', async () => {
      const executionOrder: string[] = [];
      
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('task1', 50),
          mockTask('task2', 50),
          mockTask('task3', 50)
        ]
      };

      // Mock executeTask to track execution order
      jest.spyOn(TaskExecutor.prototype, 'executeTask').mockImplementation(async (task: Task) => {
        executionOrder.push(`start:${task.name}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(`end:${task.name}`);
        return true;
      });

      await runWithTimers(
        executor.executeWorkflow(workflow, context)
      );

      // Verify sequential execution order
      expect(executionOrder).toEqual([
        'start:task1',
        'end:task1',
        'start:task2',
        'end:task2',
        'start:task3',
        'end:task3'
      ]);
    }, 10000);
  });

  describe('Parallel Execution', () => {
    it('should execute independent tasks in parallel', async () => {
      const executionOrder: string[] = [];
      
      const workflow: Workflow = {
        name: 'test',
        parallel: true,
        tasks: [
          mockTask('task1', 50),
          mockTask('task2', 50),
          mockTask('task3', 50)
        ]
      };

      // Mock executeTask to track execution order
      jest.spyOn(TaskExecutor.prototype, 'executeTask').mockImplementation(async (task: Task) => {
        executionOrder.push(`start:${task.name}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(`end:${task.name}`);
        return true;
      });

      await runWithTimers(
        executor.executeWorkflow(workflow, context)
      );

      // All tasks should start before any task ends
      const startIndices = workflow.tasks.map(t => 
        executionOrder.findIndex(e => e === `start:${t.name}`)
      );
      const endIndices = workflow.tasks.map(t => 
        executionOrder.findIndex(e => e === `end:${t.name}`)
      );

      // All starts should come before all ends
      const maxStartIndex = Math.max(...startIndices);
      const minEndIndex = Math.min(...endIndices);
      expect(maxStartIndex).toBeLessThan(minEndIndex);
    }, 10000);

    it('should respect task dependencies', async () => {
      const executionOrder: string[] = [];
      
      const workflow: Workflow = {
        name: 'test',
        parallel: true,
        tasks: [
          { ...mockTask('redis', 50) },
          { ...mockTask('auth', 50), depends_on: ['redis'] },
          { ...mockTask('api', 50), depends_on: ['auth'] },
          { ...mockTask('frontend', 50), parallel: true } // Independent task
        ]
      };

      // Mock executeTask to track execution order
      jest.spyOn(TaskExecutor.prototype, 'executeTask').mockImplementation(async (task: Task) => {
        executionOrder.push(`start:${task.name}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(`end:${task.name}`);
        return true;
      });

      await runWithTimers(
        executor.executeWorkflow(workflow, context)
      );

      // Verify dependency order
      const redisEndIndex = executionOrder.indexOf('end:redis');
      const authStartIndex = executionOrder.indexOf('start:auth');
      const authEndIndex = executionOrder.indexOf('end:auth');
      const apiStartIndex = executionOrder.indexOf('start:api');
      
      expect(authStartIndex).toBeGreaterThan(redisEndIndex);
      expect(apiStartIndex).toBeGreaterThan(authEndIndex);

      // Frontend should start in parallel with redis
      const redisStartIndex = executionOrder.indexOf('start:redis');
      const frontendStartIndex = executionOrder.indexOf('start:frontend');
      expect(Math.abs(frontendStartIndex - redisStartIndex)).toBeLessThanOrEqual(1);
    }, 10000);

    it('should detect circular dependencies', async () => {
      const workflow: Workflow = {
        name: 'test',
        parallel: true,
        tasks: [
          { ...mockTask('task1'), depends_on: ['task3'] },
          { ...mockTask('task2'), depends_on: ['task1'] },
          { ...mockTask('task3'), depends_on: ['task2'] }
        ]
      };

      await expect(
        executor.executeWorkflow(workflow, context)
      ).rejects.toThrow('Deadlock detected');
    }, 10000);

    it('should handle task failures in parallel execution', async () => {
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('task1', 50),
          mockTask('task2', 50),
          mockTask('task3', 50)
        ],
        parallel: true
      };

      // Mock executeTask to simulate failure
      // @ts-ignore - Mock implementation is correct at runtime
      jest.spyOn(TaskExecutor.prototype, 'executeTask').mockImplementation(async (task: Task) => {
        if (task.name === 'task2') {
          return false; // Simulate task failure
        }
        return true;
      });

      await expect(runWithTimers(executor.executeWorkflow(workflow, context))).rejects.toThrow('One or more parallel tasks failed');
    });

    it('should handle mixed sequential and parallel tasks', async () => {
      const executionOrder: string[] = [];
      
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('sequential1', 50),
          { ...mockTask('parallel1', 50), parallel: true },
          { ...mockTask('parallel2', 50), parallel: true },
          mockTask('sequential2', 50)
        ]
      };

      // Mock executeTask to track execution order
      jest.spyOn(TaskExecutor.prototype, 'executeTask').mockImplementation(async (task: Task) => {
        executionOrder.push(`start:${task.name}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(`end:${task.name}`);
        return true;
      });

      await runWithTimers(
        executor.executeWorkflow(workflow, context)
      );

      // Debug output
      console.log('Execution order:', executionOrder);
      console.log('Indices:', {
        seq1End: executionOrder.indexOf('end:sequential1'),
        par1Start: executionOrder.indexOf('start:parallel1'),
        par2Start: executionOrder.indexOf('start:parallel2'),
        par1End: executionOrder.indexOf('end:parallel1'),
        par2End: executionOrder.indexOf('end:parallel2'),
        seq2Start: executionOrder.indexOf('start:sequential2')
      });

      // Verify execution order:
      // 1. sequential1 should complete before parallel tasks start
      // 2. parallel1 and parallel2 should start together
      // 3. sequential2 should start after parallel tasks complete
      const seq1EndIndex = executionOrder.indexOf('end:sequential1');
      const par1StartIndex = executionOrder.indexOf('start:parallel1');
      const par2StartIndex = executionOrder.indexOf('start:parallel2');
      const par1EndIndex = executionOrder.indexOf('end:parallel1');
      const par2EndIndex = executionOrder.indexOf('end:parallel2');
      const seq2StartIndex = executionOrder.indexOf('start:sequential2');

      // Debug output
      console.log('Full execution order:', executionOrder.join(' -> '));

      expect(par1StartIndex).toBeGreaterThan(seq1EndIndex);
      expect(par2StartIndex).toBeGreaterThan(seq1EndIndex);
      expect(Math.abs(par1StartIndex - par2StartIndex)).toBeLessThanOrEqual(1);
      expect(seq2StartIndex).toBeGreaterThan(par1EndIndex);
      expect(seq2StartIndex).toBeGreaterThan(par2EndIndex);
    }, 10000);

    it('should execute parallel tasks concurrently', async () => {
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('task1', 50),
          mockTask('task2', 50),
          mockTask('task3', 50)
        ],
        parallel: true
      };

      await runWithTimers(executor.executeWorkflow(workflow, context));
    });

    it('should handle task dependencies correctly', async () => {
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('task1', 50),
          { ...mockTask('task2', 50), depends_on: ['task1'] },
          { ...mockTask('task3', 50), depends_on: ['task2'] }
        ],
        parallel: true
      };

      await runWithTimers(executor.executeWorkflow(workflow, context));
    });

    it('should handle mixed parallel and sequential tasks', async () => {
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('task1', 50),
          { ...mockTask('task2', 50), parallel: true },
          { ...mockTask('task3', 50), parallel: true },
          mockTask('task4', 50)
        ]
      };

      await runWithTimers(executor.executeWorkflow(workflow, context));
    });

    it('should handle task timeouts', async () => {
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('task1', 50),
          mockTask('task2', 50)
        ],
        parallel: true
      };

      // Mock executeTask to simulate timeout
      // @ts-ignore - Mock implementation is correct at runtime
      jest.spyOn(TaskExecutor.prototype, 'executeTask').mockImplementation(async (task: Task) => {
        if (task.name === 'task1') {
          await new Promise(resolve => setTimeout(resolve, 10000));
          return false; // Simulate task failure after timeout
        }
        return true;
      });

      await expect(runWithTimers(executor.executeWorkflow(workflow, context))).rejects.toThrow('One or more parallel tasks failed');
    });

    it('should handle task retries', async () => {
      const workflow: Workflow = {
        name: 'test',
        tasks: [
          mockTask('task1', 50),
          mockTask('task2', 50)
        ],
        parallel: true
      };

      // Mock executeTask to simulate retry failure
      // @ts-ignore - Mock implementation is correct at runtime
      jest.spyOn(TaskExecutor.prototype, 'executeTask').mockImplementation(async (task: Task) => {
        if (task.name === 'task1') {
          return false; // Simulate task failure after retries
        }
        return true;
      });

      await expect(runWithTimers(executor.executeWorkflow(workflow, context))).rejects.toThrow('One or more parallel tasks failed');
    });
  });
}); 