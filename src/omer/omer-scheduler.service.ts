import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger('OmerScheduler');
  private targetTime: string | null = null;
  private startupTime: number = 0;
  private isProcessing = false;

  // נתיב לקובץ הזיכרון - אם הגדרת Volume ב-Railway, כדאי שזה יהיה בתוכו
  private readonly lastSentPath = join(
    process.cwd(),
    '.wwebjs_auth',
    'last_sent.txt',
  );
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
    this.logger.log('🚀 Omer Scheduler עלה עם זיכרון קשיח (File-Based)');
    await this.refreshZmanim();
  }

  // פונקציה לבדיקה אם כבר שלחנו היום לפי הקובץ
  private hasAlreadySentToday(): boolean {
    const today = new Date().toLocaleDateString('en-GB'); // פורמט DD/MM/YYYY
    if (existsSync(this.lastSentPath)) {
      const lastSent = readFileSync(this.lastSentPath, 'utf8').trim();
      return lastSent === today;
    }
    return false;
  }

  private async markAsSentToday() {
    const today = new Date().toLocaleDateString('en-GB');
    try {
      // רישום פיזי לקובץ
      writeFileSync(this.lastSentPath, today, 'utf8');
      this.logger.log(`💾 נרשמה שליחה מוצלחת לתאריך: ${today}`);

      // שליחת הודעת אישור למני
      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `💾 *רישום מערכת:* השליחה להיום (${today}) נרשמה בזיכרון הקשיח ולא תבוצע שוב.`,
        )
        .catch(() => {});
    } catch (e) {
      this.logger.error(`❌ שגיאה ברישום לקובץ: ${e.message}`);
    }
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

    if (currentTime >= this.targetTime && !this.hasAlreadySentToday()) {
      if (now.getHours() < 5) {
        this.logger.warn('🕒 שעה לא מתאימה לשליחה בדיעבד, מדלג...');
        return;
      }

      this.logger.log(`⚠️ מפעיל שליחה יומית...`);
      this.isProcessing = true;
      try {
        await this.sendDailyUpdate();
        this.markAsSentToday();
      } catch (e) {
        this.logger.error(`❌ כשל בשליחה: ${e.message}`);
      } finally {
        this.isProcessing = false;
      }
    }
  }

  private async refreshZmanim() {
    const zmanIso = await this.omerService.getZmanim();
    if (zmanIso) {
      const dateObj = new Date(zmanIso);
      this.targetTime =
        dateObj.getHours().toString().padStart(2, '0') +
        ':' +
        dateObj.getMinutes().toString().padStart(2, '0');
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
