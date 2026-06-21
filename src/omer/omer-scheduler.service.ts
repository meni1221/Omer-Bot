import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CalendarProvider } from '../common/calendar.provider';
import { StateService } from '../common/state.service';
import { CONFIG } from '../config/bot.config';
import { OmerDistributionService } from './omer-distribution.service';
import { OmerReportService } from './omer-report.service';
import { OmerService } from './omer.service';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OmerSchedulerService.name);
  private targetTime: string | null = null;
  private startupTime = 0;

  constructor(
    private readonly omerService: OmerService,
    private readonly calendar: CalendarProvider,
    private readonly state: StateService,
    private readonly distribution: OmerDistributionService,
    private readonly reports: OmerReportService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.startupTime = Date.now();
    this.logger.log('Omer scheduler initialized');

    await this.refreshZmanim();
    await this.runStartupGuard();
    void this.reports.sendStartupPreview(this.targetTime);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEveryMinute(): Promise<void> {
    const status = this.calendar.getCurrentStatus(this.targetTime || undefined);
    const currentTime = this.calendar.getIsraelTime();

    if (!this.targetTime) {
      await this.refreshZmanim();
      return;
    }

    const displayTarget = status.isEarlyDay
      ? CONFIG.EARLY_SEND_TIME
      : this.targetTime;

    await this.reports.executeMinuteReports(
      currentTime,
      status.dayTypeLabel,
      displayTarget,
      this.startupTime,
    );

    if (this.distribution.isBusy()) return;

    if (status.isEarlyDay) {
      if (currentTime === CONFIG.EARLY_SEND_TIME) {
        await this.distribution.distributeForEarlyDay(status.dayType);
      }
      return;
    }

    if (this.shouldSkipRegularDistribution(status, currentTime)) return;

    if (currentTime === this.targetTime) {
      await this.distribution.distribute();
    }
  }

  private async runStartupGuard(): Promise<void> {
    const currentTime = this.calendar.getIsraelTime();
    const status = this.calendar.getCurrentStatus(this.targetTime || undefined);
    const effectiveTarget = status.isEarlyDay
      ? CONFIG.EARLY_SEND_TIME
      : this.targetTime;

    if (effectiveTarget && currentTime >= effectiveTarget) {
      await this.state.setLastSentDay(new Date().getDate());
      this.logger.log(
        `Startup guard marked today as sent. Target already passed: ${effectiveTarget}`,
      );
    }
  }

  private shouldSkipRegularDistribution(
    status: ReturnType<CalendarProvider['getCurrentStatus']>,
    currentTime: string,
  ): boolean {
    if (status.isShabbat && !status.isMotzaeiShabbat) return true;

    return (
      status.dayType === 'SHABBAT_EVE' &&
      currentTime > CONFIG.SHABBAT_PROTECTION_TIME
    );
  }

  private async refreshZmanim(): Promise<void> {
    try {
      const zmanIso = await this.omerService.getZmanim();
      if (!zmanIso) return;

      this.targetTime = new Date(zmanIso).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jerusalem',
      });
      this.logger.log(`Target time refreshed: ${this.targetTime}`);
    } catch (error) {
      this.logger.error(
        `Failed to refresh zmanim: ${(error as Error).message}`,
      );
    }
  }
}
