import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { OmerData } from './omer-data.interface';

@Injectable()
export class OmerService {
  private readonly logger = new Logger(OmerService.name);

  // משיכת זמן צאת הכוכבים מ-Hebcal עבור בני ברק
  async getZmanim(): Promise<string | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      // שימוש בפרמטר tzid כדי לוודא שהזמן חוזר בפורמט מקומי של ישראל
      const url = `https://www.hebcal.com/zmanim?cfg=json&city=IL-Bnei+Brak&date=${today}&tzid=Asia/Jerusalem`;
      const { data } = await axios.get(url);

      // ב-API של Hebcal עם פרמטר city, הזמנים נמצאים תחת אובייקט times
      const zman = data?.times?.tzeit7085deg;

      if (!zman) {
        this.logger.warn(
          'Hebcal API returned success but tzeit7085deg is missing',
        );
        return null;
      }

      return zman;
    } catch (e) {
      this.logger.error(`Failed to fetch Zmanim: ${e.message}`);
      return null;
    }
  }

  async getOmerData(): Promise<OmerData | null> {
    try {
      const { data } = await axios.get(
        'https://www.hebcal.com/hebcal?v=1&cfg=json&o=on',
      );
      const item = data.items?.find((i: any) => i.category === 'omer');

      if (!item) return null;

      const dayMatch = item.title.match(/\d+/);
      return {
        day: dayMatch ? dayMatch[0] : '',
        hebrew: item.hebrew,
      };
    } catch (e) {
      this.logger.error('Failed to fetch Omer data');
      return null;
    }
  }
}
