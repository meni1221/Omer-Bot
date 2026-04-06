import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { GROUPS } from 'src/constants/groups';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger('OmerScheduler');
  private targetTime: string | null = null;
  private lastSentDay: number | null = null;
  private startupTime: number = 0;
  private isProcessing = false;
  private readonly ownerNumber = '972533011599@c.us';
  private readonly groups: string[] = GROUPS;

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async onModuleInit() {
    this.startupTime = Date.now();
    this.logger.log('🚀 Omer Scheduler Initialized (Startup Pulse Mode)');
    await this.refreshZmanim();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute() {
    const now = new Date();

    // זמן נוכחי בשעון ישראל (HH:mm)
    const currentTime = now.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jerusalem',
    });

    if (!this.targetTime) {
      await this.refreshZmanim();
      return;
    }

    // לוג דיבג ל-Console
    if (now.getSeconds() === 0) {
      this.logger.debug(
        `[Heartbeat] ${currentTime} | Target: ${this.targetTime}`,
      );
    }

    // --- דיווח התנעה: הודעה בכל דקה ב-10 הדקות הראשונות ---
    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (minutesSinceStartup <= 10) {
      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `⚡ *דיווח התנעה (${Math.floor(minutesSinceStartup)}/10):* הבוט פעיל.\nזמן שליחה מתוכנן להיום: *${this.targetTime}*`,
        )
        .catch(() => {});
    }

    if (this.isProcessing) return;

    // --- בדיקת זמן שליחה יומית (השוואה לפי שעון ישראל) ---
    if (currentTime === this.targetTime && this.lastSentDay !== now.getDate()) {
      this.logger.log(
        `⚠️ Triggering daily distribution for day ${now.getDate()}...`,
      );
      this.isProcessing = true;
      try {
        await this.sendDailyUpdate();
        this.lastSentDay = now.getDate();
      } catch (e) {
        this.logger.error(`❌ Distribution failed: ${e.message}`);
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
        // המרת זמן היעד לשעון ישראל בצורה מפורשת
        this.targetTime = dateObj.toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jerusalem',
        });
        this.logger.log(
          `📍 Target time set to Israel Time: ${this.targetTime}`,
        );
      }
    } catch (e) {
      this.logger.error(`Failed to refresh zmanim: ${e.message}`);
    }
  }

  private async sendDailyUpdate() {
    const data = await this.omerService.getOmerData();
    const day = data?.day || '5';

    this.logger.log(`🗓️ Preparing message for Omer Day ${day}`);
    const caption = `ספירת העומר\n\n📢 הצטרפו לתזכורת :\nhttps://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\nתזכו למצוות!\n\nשימו לב שעברנו לעבודה עם רובוט 🤖`;

    for (const groupId of this.groups) {
      await this.whatsappService.sendOmerMessage(
        groupId,
        day.toString(),
        caption,
      );
    }
  }
}
