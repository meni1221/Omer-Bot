// src/common/state.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface BotState {
  lastSentDay: number;
  timestamp: string;
}

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);
  private readonly filePath = path.join(process.cwd(), 'bot-state.json');

  async setLastSentDay(day: number): Promise<void> {
    try {
      const data: BotState = {
        lastSentDay: day,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      this.logger.log(`💾 State saved: Day ${day}`);
    } catch (error) {
      this.logger.error(`❌ Failed to save state: ${(error as Error).message}`);
    }
  }

  async getLastSentDay(): Promise<number | null> {
    if (!fs.existsSync(this.filePath)) {
      this.logger.warn('⚠️ State file not found, starting fresh.');
      return null;
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data: BotState = JSON.parse(raw);
      return data.lastSentDay;
    } catch (error) {
      this.logger.error(`❌ Failed to read state: ${(error as Error).message}`);
      return null;
    }
  }
}
