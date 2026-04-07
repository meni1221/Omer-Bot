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

      const chabadZman = new Date(sunsetDate.getTime() + 24 * 60 * 1000);

      this.logger.debug(
        `Sunset: ${sunsetIso} | Chabad Target: ${chabadZman.toISOString()}`,
      );
      return chabadZman.toISOString();
    } catch (e) {
      this.logger.error(`Hebcal Zmanim Error: ${e.message}`);
      return null;
    }
  }

  /**
   * מושך את נתוני ספירת העומר המדויקים להיום מה-API
   */
  async getOmerData(): Promise<any> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];

      const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&o=on&start=${todayIso}&end=${todayIso}`;

      this.logger.debug(`Fetching Omer data for date: ${todayIso}`);
      const { data } = await axios.get(url);

      const item = data.items?.find((i: any) => i.category === 'omer');

      if (!item) {
        this.logger.warn(`No Omer data found in API for date: ${todayIso}`);
        return null;
      }

      const dayMatch = item.title.match(/\d+/);
      const dayNumber = dayMatch ? dayMatch[0] + 1 : '';

      this.logger.log(
        `Successfully fetched: Day ${dayNumber} (${item.hebrew})`,
      );

      return {
        day: dayNumber,
        hebrew: item.hebrew,
      };
    } catch (e) {
      this.logger.error(`Omer Data Fetch Error: ${e.message}`);
      return null;
    }
  }
}
