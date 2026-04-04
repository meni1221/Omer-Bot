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
    this.logger.log('🚀 Omer Bot Initializing...');
    this.startupTime = Date.now();
    
    await this.whatsappService.sendMessage(this.ownerNumber, '🤖 הבוט עלה בהצלחה! מתחיל לסרוק זמנים...').catch(() => {});
    await this.refreshZmanim();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute(): Promise<void> {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const today = now.getDate();

    await this.refreshZmanim();

    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (minutesSinceStartup <= 10 && now.getMinutes() % 2 === 0) {
      const msg = this.targetTime 
        ? `⚡ *דיווח התנעה (דקה ${Math.round(minutesSinceStartup)})*\nזמן שליחה מתוכנן: *${this.targetTime}*`
        : `⚠️ *דיווח התנעה:* לא הצלחתי למשוך זמנים.`;
      await this.whatsappService.sendMessage(this.ownerNumber, msg).catch(() => {});
    }

    if (this.targetTime && currentTime === this.targetTime && this.lastSentDay !== today) {
      await this.sendDailyUpdate();
      this.lastSentDay = today;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendHourlyStatus(): Promise<void> {
    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (this.targetTime && minutesSinceStartup > 10) {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
      await this.whatsappService.sendMessage(this.ownerNumber, `🕒 *דיווח שעתי (${currentHour})*\nזמן שליחה מתוכנן: *${this.targetTime}*`);
    }
  }

  private async refreshZmanim(): Promise<void> {
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (!zmanIso) return;

      const dateObj = new Date(zmanIso);
      if (dateObj.getDay() === 5) {
        dateObj.setTime(dateObj.getTime() - 80 * 60 * 1000);
      }

      this.targetTime = dateObj.getHours().toString().padStart(2, '0') + ':' + 
                        dateObj.getMinutes().toString().padStart(2, '0');
    } catch (e) {
      this.logger.error(`Refresh error: ${e.message}`);
    }
  }

  private async sendDailyUpdate(): Promise<void> {
    const data = await this.omerService.getOmerData();
    if (data && data.day) {
      // הטקסט המקורי שלך בדיוק
      const caption = 
        `ספירת העומר\n\n` +
        `📢 הצטרפו לתזכורת  :\n` +
        `https://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\n` +
        `תזכו למצוות!  \n\n` +
        `שימו לב שעברנו לעבודה עם רובוט 🤖`;

      for (const groupId of this.groups) {
        try {
          await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
        } catch (err) {
          this.logger.error(`Failed to send to group ${groupId}`);
        }
      }
      await this.whatsappService.sendMessage(this.ownerNumber, `✅ הודעות העומר נשלחו.`);
    }
  }
}