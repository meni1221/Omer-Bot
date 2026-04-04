import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OmerSchedulerService.name);
  private targetTime: string | null = null;
  private lastSentDay: number | null = null;
  private startupTime: number = 0;
  private readonly ownerNumber = '972533011599@c.us';

  private readonly groups: string[] = [
    '120363301374326202@g.us',
    // '120363267001121815@g.us',
    // '120363120170653605@g.us',
    // '120363426577586940@g.us',
  ];

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Omer Bot Starting Up...');
    this.startupTime = Date.now();
    await this.refreshZmanim();
  }

  // משיכה בכל דקה במהלך היום
  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute(): Promise<void> {
    const now = new Date();
    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');
    const today = now.getDate();

    await this.refreshZmanim();

    if (!this.targetTime) return;

    // דיווח התנעה: ב-10 דקות הראשונות, כל 2 דקות
    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (minutesSinceStartup <= 10 && now.getMinutes() % 2 === 0) {
      await this.whatsappService.sendMessage(
        this.ownerNumber,
        `⚡ *דיווח התנעה (דקה ${Math.round(minutesSinceStartup)})*\nזמן שליחה מתוכנן: *${this.targetTime}*`,
      );
    }

    // בדיקת זמן שליחה
    if (currentTime === this.targetTime && this.lastSentDay !== today) {
      this.logger.log(
        `✨ Time reached (${this.targetTime})! Sending Omer sequence...`,
      );
      await this.sendDailyUpdate();
      this.lastSentDay = today;
    }
  }

  // דיווח שעתי למני
  @Cron(CronExpression.EVERY_HOUR)
  async sendHourlyStatus(): Promise<void> {
    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (this.targetTime && minutesSinceStartup > 10) {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0') + ':00';

      await this.whatsappService.sendMessage(
        this.ownerNumber,
        `🕒 *דיווח שעתי (${currentHour})*\nזמן שליחה מתוכנן: *${this.targetTime}*`,
      );
    }
  }

  private async refreshZmanim(): Promise<void> {
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (!zmanIso) return;

      const dateObj = new Date(zmanIso);
      const dayOfWeek = new Date().getDay(); // 5 = Friday

      // יום שישי: שעה ו-20 דקות לפני (80 דקות)
      if (dayOfWeek === 5) {
        dateObj.setTime(dateObj.getTime() - 80 * 60 * 1000);
      }

      const h = dateObj.getHours().toString().padStart(2, '0');
      const m = dateObj.getMinutes().toString().padStart(2, '0');

      this.targetTime = `${h}:${m}`;
    } catch (e) {
      this.logger.error(`Error refreshing Zmanim: ${e.message}`);
    }
  }

  private async sendDailyUpdate(): Promise<void> {
    const data = await this.omerService.getOmerData();
    if (data && data.day) {
      // הכיתוב המלא שביקשת
      const caption =
        `*ספירת העומר - הלילה ${data.day} ימים:*\n` +
        `${data.hebrew}\n\n` +
        `📢 הצטרפו לתזכורת :\n` +
        `https://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\n` +
        `תזכו למצוות! 🕯️\n\n` +
        `שימו לב שעברנו לעבודה עם רובוט 🤖`;

      for (const groupId of this.groups) {
        try {
          await this.whatsappService.sendOmerMessage(
            groupId,
            data.day,
            caption,
          );
          this.logger.log(`Success: Group ${groupId}`);
        } catch (err) {
          this.logger.error(`Failed: Group ${groupId}`);
        }
      }

      await this.whatsappService.sendMessage(
        this.ownerNumber,
        `✅ מני, הודעות העומר נשלחו בהצלחה.`,
      );
    }
  }
}
