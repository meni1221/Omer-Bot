import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StateService {
  private readonly filePath = path.join(process.cwd(), 'bot-state.json');

  async setLastSentDay(day: number): Promise<void> {
    const data = { lastSentDay: day, timestamp: new Date().toISOString() };
    fs.writeFileSync(this.filePath, JSON.stringify(data), 'utf8');
  }

  async getLastSentDay(): Promise<number | null> {
    if (!fs.existsSync(this.filePath)) return null;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      return data.lastSentDay;
    } catch {
      return null;
    }
  }
}