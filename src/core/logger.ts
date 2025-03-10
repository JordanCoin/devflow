import chalk from 'chalk';
import ora from 'ora';

export class Logger {
  private static spinner = ora();

  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  static error(message: string): void {
    console.error(chalk.red('✖'), message);
  }

  static warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  static startSpinner(message: string): void {
    this.spinner.start(message);
  }

  static stopSpinner(success = true): void {
    if (success) {
      this.spinner.succeed();
    } else {
      this.spinner.fail();
    }
  }

  static debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  }
} 