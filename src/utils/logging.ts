import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import os from 'os';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

let currentLogLevel: LogLevel = 'info';
const spinner = ora();
const LOG_DIR = process.env.LOG_DIR || path.join(os.homedir(), '.devflow', 'logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

// Ensure log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`Failed to create log directory: ${err}`);
}

/**
 * Sets the current logging level
 * @param level Log level to set
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Checks if the given log level should be displayed
 * @param level Log level to check
 * @returns True if the level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
}

/**
 * Sanitizes log output to prevent exposing secrets
 * @param message Message to sanitize
 * @returns Sanitized message
 */
export function sanitizeLogsForSecrets(message: string): string {
  // Common patterns to redact
  const patterns = [
    // Pattern matching "password=value" -> "password=[REDACTED]"
    { pattern: /(password[^=\s]*=)([^:\s]+)/gi, replacement: '$1[REDACTED]' },
    // Pattern matching "password: value" -> "password: [REDACTED]"
    { pattern: /(password[^:\s]*:\s+)([^\s]+)/gi, replacement: '$1[REDACTED]' },
    
    // Token patterns
    { pattern: /(token[^=\s]*=)([^:\s]+)/gi, replacement: '$1[REDACTED]' },
    { pattern: /(token[^:\s]*:\s+)([^\s]+)/gi, replacement: '$1[REDACTED]' },
    { pattern: /(Bearer\s+)([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)/g, replacement: 'Bearer [REDACTED]' },
    
    // Secret patterns
    { pattern: /(secret[^=\s]*=)([^:\s]+)/gi, replacement: '$1[REDACTED]' },
    { pattern: /(secret[^:\s]*:\s+)([^\s]+)/gi, replacement: '$1[REDACTED]' },
    
    // Key patterns
    { pattern: /(key[^=\s]*=)([^:\s]+)/gi, replacement: '$1[REDACTED]' },
    { pattern: /(key[^:\s]*:\s+)([^\s]+)/gi, replacement: '$1[REDACTED]' },
    
    // Auth patterns
    { pattern: /(auth[^=\s]*=)([^:\s]+)/gi, replacement: '$1[REDACTED]' },
    { pattern: /(auth[^:\s]*:\s+)([^\s]+)/gi, replacement: '$1[REDACTED]' },
    
    // Credential patterns
    { pattern: /(cred[^=\s]*=)([^:\s]+)/gi, replacement: '$1[REDACTED]' },
    { pattern: /(cred[^:\s]*:\s+)([^\s]+)/gi, replacement: '$1[REDACTED]' },
    
    // API key patterns
    { pattern: /(api_key|apikey)([^=\s]*)=([^:\s]+)/gi, replacement: '$1$2=[REDACTED]' },
    { pattern: /(api_key|apikey)([^:\s]*):\s+([^\s]+)/gi, replacement: '$1$2: [REDACTED]' },
    
    // JWT tokens
    { pattern: /(eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)/g, replacement: '[REDACTED]' },
    
    // URLs with credentials
    { pattern: /http[^:]*:\/\/[^:@\\/\n]+:[^:@\\/\n]+@/g, replacement: 'http=[REDACTED]' },
    
    // AWS-like keys
    { pattern: /(AKIA[0-9A-Z]{16})/g, replacement: '[REDACTED]' },
    
    // Long random strings that might be keys or tokens
    { pattern: /([A-Z0-9]{20})/g, replacement: '[REDACTED]' }
  ];

  let sanitized = message;
  patterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  return sanitized;
}

/**
 * Writes a log message to file
 * @param level The log level
 * @param message The message to log
 */
function writeToLogFile(level: LogLevel, message: string): void {
  try {
    const date = new Date();
    const timestamp = date.toISOString();
    const logFile = path.join(LOG_DIR, `devflow-${date.toISOString().split('T')[0]}.log`);
    
    // Check if we need to rotate logs
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_LOG_SIZE) {
      rotateLogFiles();
    }
    
    // Write the log entry
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error(`Failed to write to log file: ${err}`);
  }
}

/**
 * Rotates log files to prevent them from growing too large
 */
function rotateLogFiles(): void {
  try {
    // Get all log files
    const logFiles = fs.readdirSync(LOG_DIR)
      .filter(file => file.startsWith('devflow-') && file.endsWith('.log'))
      .sort((a, b) => fs.statSync(path.join(LOG_DIR, b)).mtime.getTime() - 
                       fs.statSync(path.join(LOG_DIR, a)).mtime.getTime());
    
    // Delete oldest files if we have too many
    if (logFiles.length >= MAX_LOG_FILES) {
      for (let i = MAX_LOG_FILES - 1; i < logFiles.length; i++) {
        fs.unlinkSync(path.join(LOG_DIR, logFiles[i]));
      }
    }
  } catch (err) {
    console.error(`Failed to rotate log files: ${err}`);
  }
}

/**
 * Logs an error message
 * @param message Log message
 * @param error Optional error object
 */
export function error(message: string, error?: Error): void {
  if (!shouldLog('error')) return;
  
  const sanitizedMessage = sanitizeLogsForSecrets(message);
  console.error(chalk.red(`✖ ${sanitizedMessage}`));
  writeToLogFile('error', sanitizedMessage);
  
  if (error) {
    const sanitizedError = sanitizeLogsForSecrets(error.message);
    console.error(chalk.red(sanitizedError));
    writeToLogFile('error', sanitizedError);
    
    if (error.stack) {
      const sanitizedStack = sanitizeLogsForSecrets(error.stack);
      console.error(chalk.red(sanitizedStack));
      writeToLogFile('error', sanitizedStack);
    }
  }
}

/**
 * Logs a warning message
 * @param message Log message
 */
export function warn(message: string): void {
  if (!shouldLog('warn')) return;
  
  const sanitizedMessage = sanitizeLogsForSecrets(message);
  console.warn(chalk.yellow(`⚠ ${sanitizedMessage}`));
  writeToLogFile('warn', sanitizedMessage);
}

/**
 * Logs an info message
 * @param message Log message
 */
export function info(message: string): void {
  if (!shouldLog('info')) return;
  
  const sanitizedMessage = sanitizeLogsForSecrets(message);
  console.info(chalk.blue(`ℹ ${sanitizedMessage}`));
  writeToLogFile('info', sanitizedMessage);
}

/**
 * Logs a success message
 * @param message Log message
 */
export function success(message: string): void {
  if (!shouldLog('info')) return;
  
  const sanitizedMessage = sanitizeLogsForSecrets(message);
  console.info(chalk.green(`✓ ${sanitizedMessage}`));
  writeToLogFile('info', `SUCCESS: ${sanitizedMessage}`);
}

/**
 * Debug log level
 * @param message Message to log
 * @param data Optional data to log
 */
export function debug(message: string, data?: any): void {
  if (!shouldLog('debug')) return;
  
  const sanitizedMessage = sanitizeLogsForSecrets(message);
  console.debug(chalk.blue(`🔍 ${sanitizedMessage}`));
  
  if (data) {
    // Stringify and sanitize objects
    const jsonString = JSON.stringify(data, null, 2);
    const sanitizedJson = sanitizeLogsForSecrets(jsonString.replace(/"([^"]+)"\s*:\s*"([^"]+)"/g, '"$1": "[REDACTED]"'));
    console.debug(sanitizedJson);
  }
  
  writeToLogFile('debug', sanitizedMessage);
}

/**
 * Trace log level
 * @param message Message to log
 * @param data Optional data to log
 */
export function trace(message: string, data?: any): void {
  if (!shouldLog('trace')) return;
  
  const sanitizedMessage = sanitizeLogsForSecrets(message);
  console.debug(chalk.gray(`· ${sanitizedMessage}`));
  
  if (data) {
    // Stringify and sanitize objects
    const jsonString = JSON.stringify(data, null, 2);
    const sanitizedJson = sanitizeLogsForSecrets(jsonString.replace(/"([^"]+)"\s*:\s*"([^"]+)"/g, '"$1": "[REDACTED]"'));
    console.debug(sanitizedJson);
  }
  
  writeToLogFile('trace', sanitizedMessage);
}

/**
 * Starts a spinner with the given message
 * @param message Message to display with the spinner
 */
export function startSpinner(message: string): void {
  const sanitizedMessage = sanitizeLogsForSecrets(message);
  spinner.start(sanitizedMessage);
  writeToLogFile('info', `SPINNER START: ${sanitizedMessage}`);
}

/**
 * Stops the spinner with success or failure
 * @param success Whether the operation was successful
 */
export function stopSpinner(success = true): void {
  if (success) {
    spinner.succeed();
    writeToLogFile('info', 'SPINNER SUCCEEDED');
  } else {
    spinner.fail();
    writeToLogFile('error', 'SPINNER FAILED');
  }
}

/**
 * Clears old log files (older than 30 days)
 */
export function cleanLogs(days = 30): void {
  try {
    const now = Date.now();
    const maxAge = days * 24 * 60 * 60 * 1000; // days in ms
    
    const logFiles = fs.readdirSync(LOG_DIR).filter(file => file.endsWith('.log'));
    
    for (const file of logFiles) {
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error(`Failed to clean log files: ${err}`);
  }
}

export default {
  setLogLevel,
  error,
  warn,
  info,
  success,
  debug,
  trace,
  sanitizeLogsForSecrets,
  startSpinner,
  stopSpinner,
  cleanLogs
}; 