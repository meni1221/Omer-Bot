import { Injectable, Logger } from '@nestjs/common';
import { HebcalService } from '../common/hebcal.service';
import { OmerData } from '../interfaces/omer-data.interface';

@Injectable()
export class OmerService {
  private readonly logger = new Logger(OmerService.name);

  constructor(private readonly hebcalService: HebcalService) {}

  async getZmanim(): Promise<string | null> {
    this.logger.debug('Resolving Omer target time');
    return this.hebcalService.getChabadOmerSendTimeIso();
  }

  async getOmerData(): Promise<OmerData | null> {
    return this.hebcalService.getTodayOmerData();
  }
}
