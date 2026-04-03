import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OmerSchedulerService.name);

  private targetTime: string | null = null;

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
    this.logger.log(
      'Omer Scheduler (TS) initialized. Calculating target time...',
    );
    await this.updateDailyTarget();
  }

  // עדכון זמן היעד בכל בוקר ב-10:00
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async updateDailyTarget(): Promise<void> {
    const zmanIso = await this.omerService.getZmanim();
    if (zmanIso) {
      // חילוץ שעה ודקה בלבד (למשל "19:42")
      this.targetTime = new Date(zmanIso).toISOString().substring(11, 16);
      this.logger.log(
        `Target time set to: ${this.targetTime} UTC (Tzeit HaKochavim)`,
      );
    }
  }

  // בדיקה כל דקה האם הגיע הזמן
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSend(): Promise<void> {
    if (!this.targetTime) return;

    const currentTime = new Date().toISOString().substring(11, 16);

    if (currentTime === this.targetTime) {
      this.logger.log('✨ Tzeit HaKochavim reached! Executing sequence...');
      await this.sendDailyUpdate();
      this.targetTime = null; // מניעת שליחה חוזרת באותה דקה
    }
  }

  private async sendDailyUpdate(): Promise<void> {
    const data = await this.omerService.getOmerData();

    if (data && data.day) {
      const caption =
        `*ספירת העומר - הלילה ${data.day} ימים:*\n` +
        `${data.hebrew}\n\n` +
        `📢 להצטרפות לתזכורות יומיות:\n` +
        `https://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\n` +
        `תזכו למצוות! 🕯️`;

      for (const groupId of this.groups) {
        await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
      }
    }
  }
}
