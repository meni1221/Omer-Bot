import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OmerSchedulerService.name);
  private targetTime: string | null = null;
  private readonly ownerNumber = '972533011599@c.us';

  private readonly groups: string[] = [
    '120363301374326202@g.us',
    '120363267001121815@g.us',
    '120363120170653605@g.us',
    '120363426577586940@g.us',
  ];

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Startup: Running initial target time calculation...');
    await this.updateDailyTarget('הפעלת שרת');
  }

  @Cron('0 0 12 * * *')
  async handleNoonCheck(): Promise<void> {
    await this.updateDailyTarget('דגימת 12:00');
  }

  @Cron('0 0 16 * * *')
  async handleAfternoonCheck(): Promise<void> {
    await this.updateDailyTarget('בדיקה חוזרת 16:00');
  }

  async updateDailyTarget(source: string): Promise<void> {
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (zmanIso) {
        let targetDate = new Date(zmanIso);
        const dayOfWeek = new Date().getDay(); // 5 = Friday

        // עדכון ליום שישי: שעה ו-20 דקות לפני (80 דקות)
        if (dayOfWeek === 5) {
          this.logger.log(
            '📅 Friday detected: Adjusting to 80 minutes before...',
          );
          // הפחתה של 80 דקות (80 * 60 * 1000 מילישניות)
          targetDate = new Date(targetDate.getTime() - 80 * 60 * 1000);
        }

        const hours = targetDate.getHours().toString().padStart(2, '0');
        const minutes = targetDate.getMinutes().toString().padStart(2, '0');

        this.targetTime = `${hours}:${minutes}`;
        this.logger.log(`[${source}] Target time set to: ${this.targetTime}`);

        const dayType =
          dayOfWeek === 5 ? 'ערב שבת (שעה ו-20 דקות מראש)' : 'יום חול';
        await this.whatsappService.sendMessage(
          this.ownerNumber,
          `🔍 ${source}: זמן השליחה ל${dayType} נקבע ל-${this.targetTime}.`,
        );
      }
    } catch (e) {
      this.logger.error(`Failed to update target time: ${e.message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSend(): Promise<void> {
    if (!this.targetTime) return;

    const now = new Date();
    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    // התראת 10 דקות לפני
    const targetDate = new Date();
    const [h, m] = this.targetTime.split(':').map(Number);
    targetDate.setHours(h, m, 0, 0);

    const tenMinBefore = new Date(targetDate.getTime() - 10 * 60000);
    const tenMinBeforeStr =
      tenMinBefore.getHours().toString().padStart(2, '0') +
      ':' +
      tenMinBefore.getMinutes().toString().padStart(2, '0');

    if (currentTime === tenMinBeforeStr) {
      await this.whatsappService.sendMessage(
        this.ownerNumber,
        `🔔 מני, בעוד 10 דקות הודעת העומר תישלח לכל הקבוצות!`,
      );
    }

    if (currentTime === this.targetTime) {
      this.logger.log('✨ Target time reached! Sending updates...');
      await this.sendDailyUpdate();
      this.targetTime = null;
    }
  }

  private async sendDailyUpdate(): Promise<void> {
    const data = await this.omerService.getOmerData();
    if (data && data.day) {
      const caption = `*ספירת העומר - הלילה ${data.day} ימים:*\n${data.hebrew}\n\nתזכו למצוות! 🕯️`;
      for (const groupId of this.groups) {
        await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
      }
      await this.whatsappService.sendMessage(
        this.ownerNumber,
        `✅ הודעות העומר נשלחו (יום ${data.day}).`,
      );
    }
  }
}
