import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GROUPS_MIZMOR } from '../constants/groups';
import { MizmorCalendarService } from './mizmor-calendar.service';
import { MizmorService } from './mizmor.service';

@Injectable()
export class MizmorScheduler implements OnModuleInit {
  private readonly logger = new Logger(MizmorScheduler.name);

  constructor(
    private readonly mizmorService: MizmorService,
    private readonly mizmorCalendar: MizmorCalendarService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Mizmor scheduler initialized');
  }

  @Cron('0 0 7 * * *')
  async handleMorningMizmor(): Promise<void> {
    try {
      if (await this.mizmorCalendar.isHolyDay()) {
        this.logger.log('Morning Mizmor skipped: Shabbat or holiday');
        return;
      }

      this.logger.log('Sending morning Mizmor');
      await this.sendToAllGroups();
    } catch (error) {
      this.logger.error(
        `Morning Mizmor job failed: ${(error as Error).message}`,
      );
    }
  }

  @Cron('0 30 20 * * *')
  async handleEveningMizmor(): Promise<void> {
    try {
      const shouldSend =
        this.mizmorCalendar.isSaturday() ||
        (await this.mizmorCalendar.isHolyDay());

      if (!shouldSend) return;

      this.logger.log('Sending evening Mizmor after Shabbat or holiday');
      await this.sendToAllGroups();
    } catch (error) {
      this.logger.error(
        `Evening Mizmor job failed: ${(error as Error).message}`,
      );
    }
  }

  private async sendToAllGroups(): Promise<void> {
    if (!GROUPS_MIZMOR.length) {
      this.logger.error('GROUPS_MIZMOR is empty');
      return;
    }

    for (const groupId of GROUPS_MIZMOR) {
      if (groupId) {
        await this.mizmorService.sendDailyMizmor(groupId);
      }
    }
  }
}
