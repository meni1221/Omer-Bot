import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { OmerData } from './omer-data.interface';

@Injectable()
export class OmerService {
  private readonly logger = new Logger(OmerService.name);

  async getZmanim(): Promise<string | null> {
    try {
      const url = `https://www.hebcal.com/zmanim?cfg=json&latitude=32.0840&longitude=34.8340&tzid=Asia/Jerusalem`;
      const { data } = await axios.get(url, { timeout: 10000 });

      const zman =
        data?.times?.tzeit7085deg ||
        data?.times?.tzeit85deg ||
        data?.times?.tzeit72min;
      return zman || null;
    } catch (e) {
      this.logger.error(`Hebcal API Error: ${e.message}`);
      return null;
    }
  }

  async getOmerData(): Promise<OmerData | null> {
    try {
      const { data } = await axios.get(
        'https://www.hebcal.com/hebcal?v=1&cfg=json&o=on',
        { timeout: 10000 },
      );
      const item = data.items?.find((i: any) => i.category === 'omer');
      if (!item) return null;
      const dayMatch = item.title.match(/\d+/);
      return { day: dayMatch ? dayMatch[0] : '', hebrew: item.hebrew };
    } catch (e) {
      this.logger.error('Failed to fetch Omer data');
      return null;
    }
  }
}
