import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { GROUPS } from 'src/constants/groups';
import { EARLY_SEND_TIME, HOLIDAY_EVES_2026 } from 'src/constants/holidayEves';

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
    this.logger.log('🚀 Omer Scheduler Initialized (Full Calendar Logic Mode)');
    await this.refreshZmanim();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const dayOfWeek = now.getDay();

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

    const isFriday = dayOfWeek === 5;
    const isHolidayEve = HOLIDAY_EVES_2026.includes(dateStr);
    const isEarlyDay = isFriday || isHolidayEve;

    const displayTarget = isEarlyDay ? EARLY_SEND_TIME : this.targetTime;
    const dayType = isFriday
      ? 'ערב שבת 🕯️'
      : isHolidayEve
        ? 'ערב חג 🍷'
        : 'יום חול ☀️';

    if (now.getSeconds() === 0) {
      this.logger.debug(
        `[Heartbeat] ${currentTime} | ${dayType} | Target: ${displayTarget}`,
      );
    }

    const minutesSinceStartup = (Date.now() - this.startupTime) / 60000;
    if (minutesSinceStartup <= 10 && now.getSeconds() === 0) {
      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `⚡ *דיווח התנעה (${Math.floor(minutesSinceStartup)}/10):* הבוט פעיל.\n` +
            `📅 סוג יום: *${dayType}*\n` +
            `🕒 זמן שליחה מתוכנן: *${displayTarget}*`,
        )
        .catch(() => {});
    }

    if (now.getMinutes() === 0 && now.getSeconds() === 0) {
      const status =
        this.lastSentDay === now.getDate() ? '✅ נשלח' : '⏳ ממתין';
      await this.whatsappService
        .sendMessage(
          this.ownerNumber,
          `🕒 *עדכון שעתי - בוט העומר:*\n` +
            `📅 סוג יום: *${dayType}*\n` +
            `🎯 זמן יעד: *${displayTarget}*\n` +
            `📊 סטטוס: *${status}*`,
        )
        .catch(() => {});
    }

    if (this.isProcessing) return;

    if (isEarlyDay) {
      if (
        currentTime === EARLY_SEND_TIME &&
        this.lastSentDay !== now.getDate()
      ) {
        this.logger.log(`⚠️ Triggering early distribution for ${dayType}...`);
        this.isProcessing = true;
        try {
          const greeting = isFriday ? 'שבת שלום! 🍷' : 'חג שמח! 🥂';
          await this.sendDailyUpdate(
            `🕯️ *תזכורת מוקדמת:* \nהערב נספור:\n${greeting}`,
          );
          this.lastSentDay = now.getDate();
        } finally {
          this.isProcessing = false;
        }
      }
      if (currentTime >= EARLY_SEND_TIME) return;
    }

    if (dayOfWeek === 6 || (isFriday && currentTime > '19:00')) return;

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

  private async sendDailyUpdate(prefix: string = '') {
    const data = await this.omerService.getOmerData();
    const day = data?.day;

    this.logger.log(`🗓️ Preparing message for Omer Day ${day}`);
    const caption = `${prefix}\n\nספירת העומר\n\n📢 הצטרפו לתזכורת :\nhttps://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\nתזכו למצוות!\n\nשימו לב שעברנו לעבודה עם רובוט 🤖`;

    for (const groupId of this.groups) {
      await this.whatsappService.sendOmerMessage(
        groupId,
        day.toString(),
        caption,
      );
    }
  }
}
