import { Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '../config/bot.config';
import { GROUPS_OMER } from '../constants/groups';
import { MESSAGES } from '../constants/messages';
import { StateService } from '../common/state.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { OmerService } from './omer.service';

@Injectable()
export class OmerDistributionService {
  private readonly logger = new Logger(OmerDistributionService.name);
  private isProcessing = false;

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
    private readonly state: StateService,
  ) {}

  isBusy(): boolean {
    return this.isProcessing;
  }

  async distributeForEarlyDay(type: string): Promise<void> {
    const greeting =
      type === 'SHABBAT_EVE'
        ? MESSAGES.GREETINGS.SHABBAT
        : MESSAGES.GREETINGS.HOLIDAY;
    const prefix = `${MESSAGES.GREETINGS.EARLY_PREFIX} ${greeting}${MESSAGES.GREETINGS.HALACHIC_WARNING}`;

    await this.distribute(prefix);
  }

  async distribute(prefix = ''): Promise<void> {
    if (await this.wasSentToday()) return;

    this.isProcessing = true;
    try {
      const data = await this.omerService.getOmerData();
      if (!data?.day) {
        this.logger.error('Omer distribution aborted: missing Omer data');
        return;
      }

      const caption = MESSAGES.GET_FULL_CAPTION(prefix);

      for (const groupId of GROUPS_OMER) {
        await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
        await this.waitBetweenGroups();
      }

      await this.state.setLastSentDay(new Date().getDate());
      this.logger.log(`Omer distribution completed for day ${data.day}`);
    } catch (error) {
      this.logger.error(
        `Omer distribution failed: ${(error as Error).message}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async wasSentToday(): Promise<boolean> {
    const lastSent = await this.state.getLastSentDay();
    return lastSent === new Date().getDate();
  }

  private async waitBetweenGroups(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, CONFIG.DELAY.MIN));
  }
}
