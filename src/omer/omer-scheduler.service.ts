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
    this.logger.log(
      '🚀 Omer Scheduler Initialized (Heartbeat & Recovery Mode)',
    );
    await this.refreshZmanim();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute() {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentHour = now.getHours();
    const currentTime =
      currentHour.toString().padStart(2, '0') +
      ':' +
      currentMinutes.toString().padStart(2, '0');

    if (!this.targetTime) {
      await this.refreshZmanim();
      return;
    }

    this.logger.debug(
      `[Heartbeat] ${currentTime} | Target: ${this.targetTime}`,
    );

    if (this.isProcessing) return;

    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (minutesSinceStartup <= 10) {
      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `⚡ *דיווח התנעה:* הבוט עלה בהצלחה.\nזמן שליחה מתוכנן: *${this.targetTime}*`,
        )
        .catch(() => {});
    }

    if (currentMinutes === 0) {
      this.logger.log(`📢 Hourly Check: Bot is alive at ${currentTime}`);
      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `🟢 *סימן חיים שעתי:* הבוט פעיל.\nשעה: *${currentTime}*\nזמן יעד להיום: *${this.targetTime}*`,
        )
        .catch(() => {});
    }

    if (currentTime >= this.targetTime && this.lastSentDay !== now.getDate()) {
      const nowTotalMinutes = currentHour * 60 + currentMinutes;
      const [targetH, targetM] = this.targetTime.split(':').map(Number);
      const targetTotalMinutes = targetH * 60 + targetM;
      const diffMinutes = nowTotalMinutes - targetTotalMinutes;

      if (currentHour < 5) {
        this.lastSentDay = now.getDate();
        this.logger.warn(
          '🕒 Late night guard: Skipping recovery for yesterday.',
        );
        return;
      }

      if (diffMinutes > 30 && minutesSinceStartup < 5) {
        this.logger.warn(
          `⚠️ Detected late restart (${diffMinutes}m late). Assuming already sent.`,
        );
        this.lastSentDay = now.getDate();
        await this.whatsappService
          .sendMessage(
            this.ownerNumber,
            `⚠️ *הודעת הגנה:* הבוט עלה ב-Restart מאוחר (${currentTime}).\nמניח שהשליחה של ${this.targetTime} כבר בוצעה. מדלג.`,
          )
          .catch(() => {});
        return;
      }

      this.logger.log(
        `⚠️ Triggering daily distribution for day ${now.getDate()}...`,
      );
      this.isProcessing = true;
      try {
        await this.sendDailyUpdate();
        this.lastSentDay = now.getDate();
        this.logger.log(`✅ Daily distribution completed successfully.`);
      } catch (e) {
        this.logger.error(`❌ Distribution failed: ${e.message}`);
      } finally {
        this.isProcessing = false;
      }
    }
  }

  private async refreshZmanim() {
    this.logger.log('🔄 Refreshing zmanim data...');
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (zmanIso) {
        const dateObj = new Date(zmanIso);
        this.targetTime =
          dateObj.getHours().toString().padStart(2, '0') +
          ':' +
          dateObj.getMinutes().toString().padStart(2, '0');
        this.logger.log(`📍 Target time updated: ${this.targetTime}`);
      }
    } catch (e) {
      this.logger.error(`Failed to refresh zmanim: ${e.message}`);
    }
  }

  private async sendDailyUpdate() {
    const data = await this.omerService.getOmerData();
    if (data && data.day) {
      this.logger.log(`🗓️ Preparing message for Omer Day ${data.day}`);
      const caption = `ספירת העומר\n\n📢 הצטרפו לתזכורת :\nhttps://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\nתזכו למצוות!\n\nשימו לב שעברנו לעבודה עם רובוט 🤖`;

      for (const groupId of this.groups) {
        await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
      }

      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `✅ מני, הודעות העומר הופצו בהצלחה לכל הקבוצות.`,
        )
        .catch(() => {});
    } else {
      this.logger.error('❌ Could not retrieve Omer data for today.');
    }
  }
}
