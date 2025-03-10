import chalk from 'chalk';
import ora from 'ora';

export class Logger {
  private static spinner = ora();
  private static readonly debugEnabled = process.env.DEBUG === 'true';

  static info(message: string): void {
    process.stdout.write(`${chalk.blue('ℹ')} ${message}\n`);
  }

  static success(message: string): void {
    process.stdout.write(`${chalk.green('✓')} ${message}\n`);
  }

  static error(message: string): void {
    process.stderr.write(`${chalk.red('✖')} ${message}\n`);
  }

  static warn(message: string): void {
    process.stderr.write(`${chalk.yellow('⚠')} ${message}\n`);
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
    if (this.debugEnabled) {
      process.stdout.write(`${chalk.gray('🔍')} ${message}\n`);
    }
  }
} 