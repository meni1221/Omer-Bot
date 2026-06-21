import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { CONFIG } from '../config/bot.config';

interface BotState {
  lastSentDay: number;
  timestamp: string;
}

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  async setLastSentDay(day: number): Promise<void> {
    try {
      const data: BotState = {
        lastSentDay: day,
        timestamp: new Date().toISOString(),
      };

      await writeFile(
        CONFIG.PATHS.STATE_FILE,
        JSON.stringify(data, null, 2),
        'utf8',
      );
      this.logger.log(`State saved: Day ${day}`);
    } catch (error) {
      this.logger.error(`Failed to save state: ${(error as Error).message}`);
    }
  }

  async getLastSentDay(): Promise<number | null> {
    if (!existsSync(CONFIG.PATHS.STATE_FILE)) {
      this.logger.warn('State file not found, starting fresh.');
      return null;
    }

    try {
      const raw = await readFile(CONFIG.PATHS.STATE_FILE, 'utf8');
      const data = JSON.parse(raw) as BotState;
      return data.lastSentDay;
    } catch (error) {
      this.logger.error(`Failed to read state: ${(error as Error).message}`);
      return null;
    }
  }
}
