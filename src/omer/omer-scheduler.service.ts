import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CalendarProvider } from '../common/calendar.provider';
import { StateService } from '../common/state.service';
import { GROUPS } from 'src/constants/groups';
import { MESSAGES } from 'src/constants/messages';
import { CONFIG } from 'src/config/bot.config';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger('OmerScheduler');
  private targetTime: string | null = null;
  private startupTime: number = 0;
  private isProcessing = false;

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
    private readonly calendar: CalendarProvider,
    private readonly state: StateService,
  ) {}

  async onModuleInit() {
    this.startupTime = Date.now();
    this.logger.log('🚀 Omer Scheduler Initialized (Production Mode)');

    await this.refreshZmanim();
    await this.runStartupGuard();

    // מפעיל את תהליך ה-Preview (רץ ברקע באופן אסינכרוני)
    this.runStartupPreview();
  }

  /**
   * בדיקה בעליית השרת: אם עברנו את שעת היעד, נסמן את היום כנשלח כדי למנוע כפילויות
   */
  private async runStartupGuard() {
    const currentTime = this.calendar.getIsraelTime();
    const status = this.calendar.getCurrentStatus(this.targetTime || undefined);
    const effectiveTarget = status.isEarlyDay
      ? CONFIG.EARLY_SEND_TIME
      : this.targetTime;

    if (effectiveTarget && currentTime >= effectiveTarget) {
      await this.state.setLastSentDay(new Date().getDate());
      this.logger.log(
        `🛡️ Startup Guard: Past target (${effectiveTarget}). Marked as SENT.`,
      );
    }
  }

  /**
   * שליחת הודעת בדיקה למנהל כשהבוט מתחבר
   */
  private async runStartupPreview() {
    try {
      this.logger.log('⏳ Startup Preview: Waiting for WhatsApp stability...');
      let attempts = 0;
      while (!this.whatsappService.isClientReady() && attempts < 60) {
        await new Promise((res) => setTimeout(res, 1000));
        attempts++;
      }

      if (!this.whatsappService.isClientReady()) return;

      const data = await this.omerService.getOmerData();
      if (!data || !data.day) {
        this.logger.warn('Could not send startup preview: Omer data missing');
        return;
      }

      const lastSent = await this.state.getLastSentDay();
      const statusText =
        lastSent === new Date().getDate() ? '✅ נשלח/חסום' : '⏳ ממתין';

      const previewMessage =
        `🔄 *בדיקת מערכת - הבוט עלה*\n` +
        `יום מזוהה: *${data.day}*\n` +
        `יעד שליחה: ${this.targetTime || 'בחישוב...'}\n` +
        `סטטוס הפצה: ${statusText}\n` +
        `סוג בדיקה: *התנעה (Startup)* 🚀`;

      await this.whatsappService.sendOmerMessage(
        CONFIG.OWNER_NUMBER,
        data.day,
        previewMessage,
      );
    } catch (e) {
      const error = e as Error;
      this.logger.error(`Failed startup preview: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute() {
    const status = this.calendar.getCurrentStatus(this.targetTime || undefined);
    const currentTime = this.calendar.getIsraelTime();

    if (!this.targetTime) {
      await this.refreshZmanim();
      return;
    }

    const displayTarget = status.isEarlyDay
      ? CONFIG.EARLY_SEND_TIME
      : this.targetTime;

    // הרצת הדיווחים (Heartbeat ודיווח שעתי)
    await this.executeReports(currentTime, status.dayTypeLabel, displayTarget);

    if (this.isProcessing) return;

    // 1. טיפול בימים מוקדמים (ערבי שבת וחג)
    if (status.isEarlyDay) {
      if (currentTime === CONFIG.EARLY_SEND_TIME) {
        await this.handleEarlyDistribution(status.dayType);
      }
      return;
    }

    // 2. הגנה בתוך השבת ומוצ"ש
    if (status.isShabbat && !status.isMotzaeiShabbat) return;
    if (
      status.dayType === 'SHABBAT_EVE' &&
      currentTime > CONFIG.SHABBAT_PROTECTION_TIME
    )
      return;

    // 3. שליחה רגילה (ימי חול ומוצאי שבת)
    if (currentTime === this.targetTime) {
      await this.handleDistribution();
    }
  }

  private async executeReports(
    currentTime: string,
    dayLabel: string,
    target: string,
  ) {
    const now = new Date();
    if (now.getSeconds() !== 0) return;

    this.logger.debug(
      `[Heartbeat] ${currentTime} | ${dayLabel} | Target: ${target}`,
    );

    const minsActive = Math.floor((Date.now() - this.startupTime) / 60000);

    // דיווח התנעה למנהל בדקות הראשונות
    if (minsActive <= CONFIG.STARTUP_PULSE_MINUTES) {
      await this.whatsappService
        .sendMessage(
          CONFIG.OWNER_NUMBER,
          MESSAGES.STARTUP_REPORT(
            minsActive,
            CONFIG.STARTUP_PULSE_MINUTES,
            dayLabel,
            target,
          ),
        )
        .catch(() => {});
    }

    // דיווח שעתי כולל בדיקת מדיה
    if (now.getMinutes() === 0) {
      try {
        const data = await this.omerService.getOmerData();
        const lastSent = await this.state.getLastSentDay();
        const statusText = lastSent === now.getDate() ? '✅ נשלח' : '⏳ ממתין';

        await this.whatsappService.sendOmerMessage(
          CONFIG.OWNER_NUMBER,
          data?.day ?? '...',
          MESSAGES.HOURLY_REPORT(dayLabel, target, statusText),
        );
      } catch (e) {
        const error = e as Error;
        this.logger.error(`Failed hourly report: ${error.message}`);
      }
    }
  }

  private async handleEarlyDistribution(type: string) {
    const lastSent = await this.state.getLastSentDay();
    if (lastSent === new Date().getDate()) return;

    const greeting =
      type === 'SHABBAT_EVE'
        ? MESSAGES.GREETINGS.SHABBAT
        : MESSAGES.GREETINGS.HOLIDAY;
    const prefix = `${MESSAGES.GREETINGS.EARLY_PREFIX} ${greeting}${MESSAGES.GREETINGS.HALACHIC_WARNING}`;
    await this.handleDistribution(prefix);
  }

  private async handleDistribution(prefix: string = '') {
    const lastSent = await this.state.getLastSentDay();
    if (lastSent === new Date().getDate()) return;

    this.isProcessing = true;
    try {
      const data = await this.omerService.getOmerData();
      if (!data || !data.day) {
        this.logger.error('Distribution aborted: Omer data is null');
        return;
      }

      const caption = MESSAGES.GET_FULL_CAPTION(prefix);

      for (const groupId of GROUPS) {
        await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
        // השהיה קלה בין קבוצות למניעת חסימות
        await new Promise((res) => setTimeout(res, 3000));
      }

      await this.state.setLastSentDay(new Date().getDate());
      this.logger.log(`✅ Distribution completed for day ${data.day}`);
    } catch (e) {
      const error = e as Error;
      this.logger.error(`❌ Distribution failed: ${error.message}`);
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
        this.logger.log(`📍 Target time refreshed: ${this.targetTime}`);
      }
    } catch (e) {
      const error = e as Error;
      this.logger.error(`Failed to refresh zmanim: ${error.message}`);
    }
  }
}
