import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { MessageMedia } from 'whatsapp-web.js';
import { CONFIG } from '../config/bot.config';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { MizmorStateService } from './mizmor-state.service';

@Injectable()
export class MizmorService {
  private readonly logger = new Logger(MizmorService.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly mizmorState: MizmorStateService,
  ) {}

  async sendDailyMizmor(targetId: string): Promise<void> {
    if (!this.isValidTarget(targetId)) {
      this.logger.error('Invalid target ID for Mizmor delivery');
      return;
    }

    const fileNumber = this.mizmorState.getNextFileNumber();
    const imagePath = join(CONFIG.PATHS.ASSETS_MIZMOR, `${fileNumber}.jpg`);
    const caption = this.buildCaption();

    try {
      if (!existsSync(imagePath)) {
        this.logger.error(`Mizmor image is missing: ${imagePath}`);
        await this.whatsappService.sendMessage(targetId, caption);
        return;
      }

      this.logger.log(`Sending Mizmor image number ${fileNumber}`);
      const media = MessageMedia.fromFilePath(imagePath);
      await this.whatsappService.sendMessage(targetId, media, { caption });
      this.logger.log(`Mizmor sent successfully to ${targetId}`);
    } catch (error) {
      this.logger.error(`Mizmor delivery failed: ${(error as Error).message}`);
      await this.whatsappService.sendMessage(targetId, caption);
    }
  }

  private buildCaption(): string {
    return `*מזמור לתודה!* ✨\n\nלהצטרפות לקבוצה:\n${CONFIG.MIZMOR_LINK}`;
  }

  private isValidTarget(targetId: string): boolean {
    return Boolean(targetId && targetId.length >= 5);
  }
}
