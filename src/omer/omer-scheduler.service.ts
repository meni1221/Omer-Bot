import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger('OmerScheduler');
  private targetTime: string | null = null;
  private lastSentDay: number | null = null;
  private startupTime: number = 0;
  private isProcessing = false;
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

  async onModuleInit() {
    this.startupTime = Date.now();
    this.logger.log('🚀 Omer Scheduler עלה (מצב חכם ללא Volume)');
    await this.refreshZmanim();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute() {
    const now = new Date();
    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    if (!this.targetTime) {
      await this.refreshZmanim();
      return;
    }

    this.logger.debug(`[Heartbeat] ${currentTime} | יעד: ${this.targetTime}`);

    if (this.isProcessing) return;

    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (minutesSinceStartup <= 10) {
      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `⚡ דיווח התנעה: זמן יעד ${this.targetTime}`,
        )
        .catch(() => {});
    }

    if (currentTime >= this.targetTime && this.lastSentDay !== now.getDate()) {
      const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const [targetH, targetM] = this.targetTime.split(':').map(Number);
      const targetTotalMinutes = targetH * 60 + targetM;
      const diffMinutes = nowTotalMinutes - targetTotalMinutes;

      if (now.getHours() < 5) {
        this.lastSentDay = now.getDate();
        return;
      }

      if (diffMinutes > 30 && minutesSinceStartup < 5) {
        this.logger.warn(
          `⚠️ זיהיתי Restart מאוחר (${diffMinutes} דקות אחרי היעד). מניח שכבר נשלח. מדלג.`,
        );
        this.lastSentDay = now.getDate();
        await this.whatsappService
          .sendMessage(
            this.ownerNumber,
            `⚠️ שים לב: הבוט עלה ב-Restart מאוחר ומניח שכבר נשלח היום ב-${this.targetTime}.`,
          )
          .catch(() => {});
        return;
      }

      this.logger.log(`⚠️ מפעיל שליחה יומית ליום ${now.getDate()}...`);
      this.isProcessing = true;
      try {
        await this.sendDailyUpdate();
        this.lastSentDay = now.getDate();
        this.logger.log(`✅ סיום סבב שליחה מוצלח.`);
      } catch (e) {
        this.logger.error(`❌ כשל בשליחה: ${e.message}`);
      } finally {
        this.isProcessing = false;
      }
    }
  }

  private async refreshZmanim() {
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (zmanIso) {
        const dateObj = new Date(zmanIso);
        this.targetTime =
          dateObj.getHours().toString().padStart(2, '0') +
          ':' +
          dateObj.getMinutes().toString().padStart(2, '0');
        this.logger.log(`📍 זמן מטרה עודכן: ${this.targetTime}`);
      }
    } catch (e) {
      this.logger.error('Error refreshing zmanim');
    }
  }

  private async sendDailyUpdate() {
    const data = await this.omerService.getOmerData();
    if (data && data.day) {
      const caption = `ספירת העומר\n\n📢 הצטרפו לתזכורת :\nhttps://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\nתזכו למצוות!\n\nשימו לב שעברנו לעבודה עם רובוט 🤖`;
      for (const groupId of this.groups) {
        await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
      }
      await this.whatsappService
        .sendMessage(this.ownerNumber, `✅ מני, הודעות העומר נשלחו.`)
        .catch(() => {});
    }
  }
}
