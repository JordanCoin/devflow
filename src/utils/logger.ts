import chalk from 'chalk';

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(chalk.blue('ℹ'), message, ...args);
  },
  success: (message: string, ...args: unknown[]) => {
    console.log(chalk.green('✓'), message, ...args);
  },
  warning: (message: string, ...args: unknown[]) => {
    console.log(chalk.yellow('⚠'), message, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(chalk.red('✖'), message, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.DEBUG) {
      console.debug(chalk.gray('🔍'), message, ...args);
    }
  }
}; 