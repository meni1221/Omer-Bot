import { Injectable, Logger } from '@nestjs/common';
import { HebcalService } from '../common/hebcal.service';

@Injectable()
export class MizmorCalendarService {
  private readonly logger = new Logger(MizmorCalendarService.name);

  constructor(private readonly hebcalService: HebcalService) {}

  async isHolyDay(): Promise<boolean> {
    const now = new Date();
    if (now.getDay() === 6) return true;

    try {
      return await this.hebcalService.isTodayYomTov();
    } catch (error) {
      this.logger.error(
        `Failed to check Mizmor holy day: ${(error as Error).message}`,
      );
      return false;
    }
  }

  isSaturday(): boolean {
    return new Date().getDay() === 6;
  }
}
