import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { GROUPS } from 'src/constants/groups';
import { HOLIDAY_EVES_2026 } from 'src/constants/calendar';
import { MESSAGES } from 'src/constants/messages';
import { CONFIG } from 'src/config/bot.config';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger('OmerScheduler');
  private targetTime: string | null = null;
  private lastSentDay: number | null = null;
  private startupTime: number = 0;
  private isProcessing = false;

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async onModuleInit() {
    this.startupTime = Date.now();
    this.logger.log('🚀 Omer Scheduler Initialized (Production Mode)');
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

    // --- זיהוי סוג יום ויעד ---
    const isFriday = dayOfWeek === 5;
    const isHolidayEve = HOLIDAY_EVES_2026.includes(dateStr);
    const isEarlyDay = isFriday || isHolidayEve;
    const displayTarget = isEarlyDay ? CONFIG.EARLY_SEND_TIME : this.targetTime;
    const dayType = isFriday
      ? 'ערב שבת 🕯️'
      : isHolidayEve
        ? 'ערב חג 🍷'
        : 'יום חול ☀️';

    // --- לוגים ודיווחים ---
    this.executeReports(now, currentTime, dayType, displayTarget);

    if (this.isProcessing) return;

    // --- לוגיקת שליחה מוקדמת (שישי/חג) ---
    if (isEarlyDay) {
      if (
        currentTime === CONFIG.EARLY_SEND_TIME &&
        this.lastSentDay !== now.getDate()
      ) {
        const greeting = isFriday
          ? MESSAGES.GREETINGS.SHABBAT
          : MESSAGES.GREETINGS.HOLIDAY;
        const fullPrefix = `${MESSAGES.GREETINGS.EARLY_PREFIX} ${greeting}${MESSAGES.GREETINGS.HALACHIC_WARNING}`;
        await this.handleDistribution(now, fullPrefix);
      }
      if (currentTime >= CONFIG.EARLY_SEND_TIME) return;
    }

    // --- הגנת שבת ושליחה רגילה ---
    if (
      dayOfWeek === 6 ||
      (isFriday && currentTime > CONFIG.SHABBAT_PROTECTION_TIME)
    )
      return;

    if (currentTime === this.targetTime && this.lastSentDay !== now.getDate()) {
      await this.handleDistribution(now);
    }
  }

  private async executeReports(
    now: Date,
    currentTime: string,
    dayType: string,
    displayTarget: string,
  ) {
    if (now.getSeconds() !== 0) return;

    this.logger.debug(
      `[Heartbeat] ${currentTime} | ${dayType} | Target: ${displayTarget}`,
    );

    const minsActive = Math.floor((Date.now() - this.startupTime) / 60000);

    if (minsActive <= CONFIG.STARTUP_PULSE_MINUTES) {
      await this.whatsappService
        .sendMessage(
          CONFIG.OWNER_NUMBER,
          MESSAGES.STARTUP_REPORT(
            minsActive,
            CONFIG.STARTUP_PULSE_MINUTES,
            dayType,
            displayTarget,
          ),
        )
        .catch(() => {});
    }

    if (now.getMinutes() === 0) {
      const status =
        this.lastSentDay === now.getDate() ? '✅ נשלח' : '⏳ ממתין';
      await this.whatsappService
        .sendMessage(
          CONFIG.OWNER_NUMBER,
          MESSAGES.HOURLY_REPORT(dayType, displayTarget, status),
        )
        .catch(() => {});
    }
  }

  private async handleDistribution(now: Date, prefix: string = '') {
    this.logger.log(`⚠️ Triggering distribution...`);
    this.isProcessing = true;
    try {
      await this.sendDailyUpdate(prefix);
      this.lastSentDay = now.getDate();
    } catch (e) {
      this.logger.error(`❌ Distribution failed: ${e.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async refreshZmanim() {
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (zmanIso) {
        this.targetTime = new Date(zmanIso).toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jerusalem',
        });
        this.logger.log(`📍 Target time set: ${this.targetTime}`);
      }
    } catch (e) {
      this.logger.error(`Failed refresh: ${e.message}`);
    }
  }

  private async sendDailyUpdate(prefix: string = '') {
    const data = await this.omerService.getOmerData();
    const day = data?.day || '6';
    const caption = MESSAGES.GET_FULL_CAPTION(prefix);

    for (const groupId of GROUPS) {
      await this.whatsappService.sendOmerMessage(
        groupId,
        day.toString(),
        caption,
      );
    }
  }
}
