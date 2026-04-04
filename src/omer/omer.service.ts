import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { OmerData } from './omer-data.interface';

@Injectable()
export class OmerService {
  private readonly logger = new Logger(OmerService.name);

  async getZmanim(): Promise<string | null> {
    try {
      // מעבר לקואורדינטות של בני ברק - זה הכי אמין ב-Hebcal
      const lat = '32.0840';
      const lng = '34.8340';
      const url = `https://www.hebcal.com/zmanim?cfg=json&latitude=${lat}&longitude=${lng}&tzid=Asia/Jerusalem`;

      const { data } = await axios.get(url);

      // בפורמט הזה הזמנים נמצאים תחת data.times
      // ננסה קודם את tzeit7085deg, ואם לא קיים - ניקח את tzeit85deg (שהוא כמעט זהה)
      const zman = data?.times?.tzeit7085deg || data?.times?.tzeit85deg;

      if (!zman) {
        this.logger.warn('Could not find Tzeit types in Hebcal response');
        return null;
      }

      return zman;
    } catch (e) {
      this.logger.error(`Hebcal API Error: ${e.message}`);
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
