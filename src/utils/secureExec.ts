import { spawn, SpawnOptions } from 'child_process';
import * as logging from './logging';

/**
 * Interface for secure execution options
 */
interface SecureExecOptions extends SpawnOptions {
  /**
   * Maximum execution time in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to sanitize the output
   */
  sanitizeOutput?: boolean;
  
  /**
   * Whether to log the command execution
   */
  silent?: boolean;
  
  /**
   * Callback for data received on stdout
   */
  onStdout?: (data: string) => void;
  
  /**
   * Callback for data received on stderr
   */
  onStderr?: (data: string) => void;
}

/**
 * Interface for secure execution result
 */
interface SecureExecResult {
  /**
   * Exit code of the command
   */
  code: number;
  
  /**
   * Standard output of the command
   */
  stdout: string;
  
  /**
   * Standard error output of the command
   */
  stderr: string;
  
  /**
   * Whether the command timed out
   */
  timedOut: boolean;
}

/**
 * Validates a command to ensure it doesn't contain dangerous patterns
 * @param command Command to validate
 * @param args Command arguments
 * @returns True if the command is safe, false otherwise
 */
function validateCommand(command: string, args: string[]): boolean {
  // List of dangerous patterns in commands
  const dangerousPatterns = [
    /;\s*rm/i,          // Semicolon followed by rm
    /;\s*dd/i,          // Semicolon followed by dd
    /;\s*wget/i,        // Semicolon followed by wget
    /;\s*curl/i,        // Semicolon followed by curl
    /\|\s*rm/i,         // Pipe to rm
    /\|\s*dd/i,         // Pipe to dd
    /\|\s*wget/i,       // Pipe to wget
    /\|\s*curl/i,       // Pipe to curl
    />\s*\/etc/i,       // Output redirection to /etc
    />\s*\/dev/i,       // Output redirection to /dev
    />\s*\/sys/i,       // Output redirection to /sys
    />\s*\/proc/i,      // Output redirection to /proc
    />\s*\/boot/i,      // Output redirection to /boot
    />\s*\/bin/i,       // Output redirection to /bin
    />\s*\/sbin/i,      // Output redirection to /sbin
    />\s*\/usr/i,       // Output redirection to /usr
    />\s*\/lib/i,       // Output redirection to /lib
    /`.*`/,             // Command substitution with backticks
    /\$\(.+\)/,         // Command substitution with $()
    /\$\{\s*[#!]?\s*/   // Shell expansion with ${
  ];
  
  // Check the command
  if (dangerousPatterns.some(pattern => pattern.test(command))) {
    return false;
  }
  
  // Check each argument
  for (const arg of args) {
    if (dangerousPatterns.some(pattern => pattern.test(arg))) {
      return false;
    }
  }
  
  return true;
}

/**
 * Executes a command securely, preventing command injection
 * @param command Command to execute
 * @param args Command arguments
 * @param options Options for command execution
 * @returns Promise that resolves with the command result
 */
export async function secureExec(
  command: string,
  args: string[] = [],
  options: SecureExecOptions = {}
): Promise<SecureExecResult> {
  // Validate command and arguments
  if (!validateCommand(command, args)) {
    throw new Error('Potentially dangerous command or arguments detected');
  }
  
  // Default options
  const defaultOptions: SecureExecOptions = {
    timeout: 60000,
    sanitizeOutput: true,
    silent: false,
    env: { ...process.env }
  };
  
  // Merge options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Log command execution
  if (!mergedOptions.silent) {
    logging.debug(`Executing command: ${command} ${args.join(' ')}`);
  }
  
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Spawn process
    const childProcess = spawn(command, args, mergedOptions);
    
    // Set timeout if specified
    if (mergedOptions.timeout) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        childProcess.kill();
        
        if (!mergedOptions.silent) {
          logging.warn(`Command timed out after ${mergedOptions.timeout}ms: ${command} ${args.join(' ')}`);
        }
      }, mergedOptions.timeout);
    }
    
    // Collect stdout
    childProcess.stdout?.on('data', (data) => {
      const strData = data.toString();
      stdout += strData;
      
      if (mergedOptions.onStdout) {
        mergedOptions.onStdout(strData);
      }
    });
    
    // Collect stderr
    childProcess.stderr?.on('data', (data) => {
      const strData = data.toString();
      stderr += strData;
      
      if (mergedOptions.onStderr) {
        mergedOptions.onStderr(strData);
      }
    });
    
    // Handle process exit
    childProcess.on('close', (code) => {
      // Clear timeout if set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Sanitize output if requested
      if (mergedOptions.sanitizeOutput) {
        stdout = logging.sanitizeLogsForSecrets(stdout);
        stderr = logging.sanitizeLogsForSecrets(stderr);
      }
      
      // Log completion
      if (!mergedOptions.silent) {
        if (code === 0) {
          logging.debug(`Command completed successfully: ${command} ${args.join(' ')}`);
        } else {
          logging.warn(`Command exited with code ${code}: ${command} ${args.join(' ')}`);
        }
      }
      
      // Resolve with result
      resolve({
        code: code !== null ? code : 1,
        stdout,
        stderr,
        timedOut
      });
    });
    
    // Handle process error
    childProcess.on('error', (error) => {
      // Clear timeout if set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (!mergedOptions.silent) {
        logging.error(`Command execution failed: ${command} ${args.join(' ')}`, error);
      }
      
      reject(error);
    });
  });
}

/**
 * Checks if a command exists in the system
 * @param command Command to check
 * @returns Promise that resolves with true if the command exists, false otherwise
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32';
    const checkCommand = isWindows ? 'where' : 'which';
    const args = isWindows ? [command] : ['-s', command];
    
    const result = await secureExec(checkCommand, args, { silent: true });
    return result.code === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Executes a command securely and returns the result as a string
 * @param command Command to execute
 * @param args Command arguments
 * @param options Options for command execution
 * @returns Promise that resolves with the command output
 */
export async function secureExecToString(
  command: string,
  args: string[] = [],
  options: SecureExecOptions = {}
): Promise<string> {
  const result = await secureExec(command, args, options);
  
  if (result.code !== 0) {
    throw new Error(`Command failed with exit code ${result.code}: ${result.stderr}`);
  }
  
  return result.stdout.trim();
}

export default {
  secureExec,
  secureExecToString,
  commandExists
}; 