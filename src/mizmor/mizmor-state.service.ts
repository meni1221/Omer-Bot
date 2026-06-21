import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { CONFIG } from '../config/bot.config';

interface MizmorState {
  lastSent: number;
  lastUpdated: string;
}

@Injectable()
export class MizmorStateService {
  private readonly logger = new Logger(MizmorStateService.name);

  getNextFileNumber(): number {
    const current = this.readLastSent();
    const next =
      current >= CONFIG.MIZMOR_TOTAL_FILES || current < 0 ? 1 : current + 1;

    this.writeState({
      lastSent: next,
      lastUpdated: new Date().toISOString(),
    });

    return next;
  }

  private readLastSent(): number {
    if (!existsSync(CONFIG.PATHS.MIZMOR_STATE)) {
      return 0;
    }

    try {
      const raw = readFileSync(CONFIG.PATHS.MIZMOR_STATE, 'utf-8');
      const state = JSON.parse(raw) as Partial<MizmorState>;
      return Number(state.lastSent ?? 0);
    } catch {
      this.logger.warn('Mizmor state file is invalid. Starting from 0.');
      return 0;
    }
  }

  private writeState(state: MizmorState): void {
    try {
      writeFileSync(
        CONFIG.PATHS.MIZMOR_STATE,
        JSON.stringify(state, null, 2),
        'utf-8',
      );
    } catch (error) {
      this.logger.error(
        `Failed to write Mizmor state: ${(error as Error).message}`,
      );
    }
  }
}
