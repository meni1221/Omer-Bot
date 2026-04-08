import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { GROUPS } from 'src/constants/groups';
import { HOLIDAY_EVES_2026 } from 'src/constants/calendar'; // CONFIG הוסר מכאן
import { MESSAGES } from 'src/constants/messages';
import { CONFIG } from 'src/config/bot.config'; // CONFIG מיובא מכאן כראוי

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

    this.checkIfAlreadySentToday();

    await this.runStartupPreview();
  }

  private checkIfAlreadySentToday() {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jerusalem',
    });

    const dateStr = now.toLocaleDateString('en-CA');
    const isEarlyDay =
      now.getDay() === 5 || HOLIDAY_EVES_2026.includes(dateStr);

    const effectiveTarget = isEarlyDay
      ? CONFIG.EARLY_SEND_TIME
      : this.targetTime;

    // הגנה: אם עברנו את זמן השליחה, מסמנים כנשלח כדי למנוע כפילויות בריסטארט
    if (effectiveTarget && currentTime >= effectiveTarget) {
      this.lastSentDay = now.getDate();
      this.logger.log(
        `🛡️ Startup Guard: Current time (${currentTime}) is past target (${effectiveTarget}). Today marked as SENT.`,
      );
    }
  }

  private async runStartupPreview() {
    try {
      this.logger.log('📸 Generating startup preview for admin...');
      const data = await this.omerService.getOmerData();
      const day = data?.day || '7'; // ברירת מחדל ליום 7 אם נכשל

      const previewMessage = `🔄 *בדיקת מערכת - הבוט עלה*\nיום העומר שזוהה: *${day}*\nיעד שליחה: ${this.targetTime || 'בחישוב...'}\nסטטוס הפצה: ${this.lastSentDay === new Date().getDate() ? '✅ נשלח/חסום' : '⏳ ממתין'}`;

      await this.whatsappService.sendOmerMessage(
        CONFIG.OWNER_NUMBER,
        day.toString(),
        previewMessage,
      );

      this.logger.log(`✅ Startup preview sent to admin (Day: ${day})`);
    } catch (e: any) {
      this.logger.error(`Failed to send startup preview: ${e.message}`);
    }
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
    const displayTarget = isEarlyDay ? CONFIG.EARLY_SEND_TIME : this.targetTime;

    const dayType = isFriday
      ? 'ערב שבת 🕯️'
      : isHolidayEve
        ? 'ערב חג 🍷'
        : 'יום חול ☀️';

    this.executeReports(now, currentTime, dayType, displayTarget);

    if (this.isProcessing) return;

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

    // מניעת שליחה בשבת
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

    // דיווח ראשוני למנהל על עליית מערכת
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

    // דיווח שעתי
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
    } catch (e: any) {
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
    } catch (e: any) {
      this.logger.error(`Failed refresh: ${e.message}`);
    }
  }

  private async sendDailyUpdate(prefix: string = '') {
    const data = await this.omerService.getOmerData();
    const day = data?.day || '7';
    const caption = MESSAGES.GET_FULL_CAPTION(prefix);

    for (const groupId of GROUPS) {
      await this.whatsappService.sendOmerMessage(
        groupId,
        day.toString(),
        caption,
      );
      // השהיה בין קבוצות למניעת חסימות
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}
