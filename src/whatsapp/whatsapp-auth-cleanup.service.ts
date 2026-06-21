import { Injectable, Logger } from '@nestjs/common';
import { existsSync, lstatSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { CONFIG } from '../config/bot.config';

@Injectable()
export class WhatsappAuthCleanupService {
  private readonly logger = new Logger(WhatsappAuthCleanupService.name);

  cleanupLockFiles(): void {
    try {
      const authPath = CONFIG.PATHS.AUTH_DIR;
      if (!existsSync(authPath)) return;

      this.logger.warn('Scanning WhatsApp auth directory for lock files...');
      this.removeSingletonLocks(authPath);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup WhatsApp lock files: ${(error as Error).message}`,
      );
    }
  }

  private removeSingletonLocks(directory: string): void {
    const items = readdirSync(directory);

    for (const item of items) {
      const fullPath = join(directory, item);
      if (lstatSync(fullPath).isDirectory()) {
        this.removeSingletonLocks(fullPath);
        continue;
      }

      if (item === 'SingletonLock') {
        rmSync(fullPath, { force: true });
        this.logger.log(`Removed lock file: ${fullPath}`);
      }
    }
  }
}
