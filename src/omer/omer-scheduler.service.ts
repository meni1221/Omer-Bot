import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OmerSchedulerService.name);
  private targetTime: string | null = null;
  private lastSentDay: number | null = null;
  private isProcessing = false;

  private readonly ownerNumber = '972533011599@c.us';
  private readonly groups = [
    '120363301374326202@g.us',
    '120363267001121815@g.us',
    '120363120170653605@g.us',
    '120363426577586940@g.us',
  ];

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Omer Bot Service Started');
    await this.refreshZmanim();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (this.isProcessing) return;

    const now = new Date();
    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    await this.refreshZmanim();

    if (
      this.targetTime &&
      currentTime === this.targetTime &&
      this.lastSentDay !== now.getDate()
    ) {
      this.isProcessing = true;
      try {
        this.logger.log(
          `✨ Reached target time: ${this.targetTime}. Sending...`,
        );
        await this.sendDailyUpdate();
        this.lastSentDay = now.getDate();
      } catch (e) {
        this.logger.error(`Critical error during daily update: ${e.message}`);
      } finally {
        this.isProcessing = false;
      }
    }
  }

  private async refreshZmanim() {
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (!zmanIso) return;

      const dateObj = new Date(zmanIso);
      if (dateObj.getDay() === 5) {
        dateObj.setTime(dateObj.getTime() - 80 * 60 * 1000);
      }

      this.targetTime =
        dateObj.getHours().toString().padStart(2, '0') +
        ':' +
        dateObj.getMinutes().toString().padStart(2, '0');
    } catch (e) {
      this.logger.error(`Error in refreshZmanim: ${e.message}`);
    }
  }

  private async sendDailyUpdate() {
    const data = await this.omerService.getOmerData();
    if (!data) return;

    const caption =
      `ספירת העומר\n\n` +
      `📢 הצטרפו לתזכורת  :\n` +
      `https://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\n` +
      `תזכו למצוות!  \n\n` +
      `שימו לב שעברנו לעבודה עם רובוט 🤖`;

    for (const gid of this.groups) {
      try {
        await this.whatsappService.sendOmerMessage(gid, data.day, caption);
        this.logger.log(`Sent to group: ${gid}`);
      } catch (err) {
        this.logger.error(`Failed sending to ${gid}: ${err.message}`);
      }
    }

    // הודעת אישור למני
    await this.whatsappService
      .sendMessage(this.ownerNumber, `✅ מני, הודעות העומר נשלחו בהצלחה.`)
      .catch(() => {});
  }
}
