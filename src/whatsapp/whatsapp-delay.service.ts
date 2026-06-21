import { Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '../config/bot.config';

@Injectable()
export class WhatsappDelayService {
  private readonly logger = new Logger(WhatsappDelayService.name);

  async waitBeforeSend(): Promise<void> {
    const { MIN, MAX } = CONFIG.DELAY;
    const delayMs = Math.floor(Math.random() * (MAX - MIN + 1) + MIN);

    this.logger.debug(`Anti-ban delay: waiting ${delayMs}ms before sending`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
