import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OmerService {
  private readonly logger = new Logger(OmerService.name);

  async getZmanim(): Promise<string | null> {
    try {
      const url = `https://www.hebcal.com/zmanim?cfg=json&latitude=32.0840&longitude=34.8340&tzid=Asia/Jerusalem`;
      const { data } = await axios.get(url, { timeout: 10000 });

      const sunsetIso = data?.times?.sunset;
      if (!sunsetIso) return null;

      const sunsetDate = new Date(sunsetIso);

      // לוח חב"ד בני ברק: שקיעה + 24 דקות
      const chabadZman = new Date(sunsetDate.getTime() + 24 * 60 * 1000);

      this.logger.debug(
        `Sunset: ${sunsetIso} | Chabad Target: ${chabadZman.toISOString()}`,
      );
      return chabadZman.toISOString();
    } catch (e) {
      this.logger.error(`Hebcal Error: ${e.message}`);
      return null;
    }
  }

  async getOmerData(): Promise<any> {
    try {
      const { data } = await axios.get(
        'https://www.hebcal.com/hebcal?v=1&cfg=json&o=on',
      );
      const item = data.items?.find((i: any) => i.category === 'omer');
      if (!item) return null;
      const dayMatch = item.title.match(/\d+/);
      return { day: dayMatch ? dayMatch[0] : '', hebrew: item.hebrew };
    } catch (e) {
      return null;
    }
  }
}
