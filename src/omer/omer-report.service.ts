import { Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '../config/bot.config';
import { MESSAGES } from '../constants/messages';
import { StateService } from '../common/state.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { OmerService } from './omer.service';

@Injectable()
export class OmerReportService {
  private readonly logger = new Logger(OmerReportService.name);

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
    private readonly state: StateService,
  ) {}

  async sendStartupPreview(targetTime: string | null): Promise<void> {
    try {
      this.logger.log('Startup preview waiting for WhatsApp readiness...');
      const isReady = await this.waitForWhatsapp();
      if (!isReady) return;

      const data = await this.omerService.getOmerData();
      if (!data?.day) {
        this.logger.warn('Could not send startup preview: Omer data missing');
        return;
      }

      const lastSent = await this.state.getLastSentDay();
      const statusText =
        lastSent === new Date().getDate() ? 'נשלח/חסום' : 'ממתין';
      const previewMessage =
        `*בדיקת מערכת - הבוט עלה*\n` +
        `יום מזוהה: *${data.day}*\n` +
        `יעד שליחה: ${targetTime || 'בחישוב...'}\n` +
        `סטטוס הפצה: ${statusText}\n` +
        `סוג בדיקה: *התנעה*`;

      await this.whatsappService.sendOmerMessage(
        CONFIG.OWNER_NUMBER,
        data.day,
        previewMessage,
      );
    } catch (error) {
      this.logger.error(`Failed startup preview: ${(error as Error).message}`);
    }
  }

  async executeMinuteReports(
    currentTime: string,
    dayLabel: string,
    target: string,
    startupTime: number,
  ): Promise<void> {
    const now = new Date();
    if (now.getSeconds() !== 0) return;

    this.logger.debug(
      `[Heartbeat] ${currentTime} | ${dayLabel} | Target: ${target}`,
    );

    await this.sendStartupPulse(dayLabel, target, startupTime);

    if (now.getMinutes() === 0) {
      await this.sendHourlyReport(dayLabel, target);
    }
  }

  private async sendStartupPulse(
    dayLabel: string,
    target: string,
    startupTime: number,
  ): Promise<void> {
    const minutesActive = Math.floor((Date.now() - startupTime) / 60000);
    if (minutesActive > CONFIG.STARTUP_PULSE_MINUTES) return;

    await this.whatsappService
      .sendMessage(
        CONFIG.OWNER_NUMBER,
        MESSAGES.STARTUP_REPORT(
          minutesActive,
          CONFIG.STARTUP_PULSE_MINUTES,
          dayLabel,
          target,
        ),
      )
      .catch(() => undefined);
  }

  private async sendHourlyReport(
    dayLabel: string,
    target: string,
  ): Promise<void> {
    try {
      const data = await this.omerService.getOmerData();
      const lastSent = await this.state.getLastSentDay();
      const statusText = lastSent === new Date().getDate() ? 'נשלח' : 'ממתין';

      await this.whatsappService.sendOmerMessage(
        CONFIG.OWNER_NUMBER,
        data?.day ?? '...',
        MESSAGES.HOURLY_REPORT(dayLabel, target, statusText),
      );
    } catch (error) {
      this.logger.error(`Failed hourly report: ${(error as Error).message}`);
    }
  }

  private async waitForWhatsapp(): Promise<boolean> {
    let attempts = 0;
    while (!this.whatsappService.isClientReady() && attempts < 60) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    return this.whatsappService.isClientReady();
  }
}
