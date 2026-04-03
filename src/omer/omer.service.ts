import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { OmerData } from './omer-data.interface';

@Injectable()
export class OmerService {
  private readonly logger = new Logger(OmerService.name);

  // החזרת זמן צאת הכוכבים כ-string (ISO Format)
  async getZmanim(): Promise<string | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `https://www.hebcal.com/zmanim?cfg=json&city=IL-Bnei+Brak&date=${today}`;
      const { data } = await axios.get(url);

      // tzeit7085deg הוא תקן מקובל לצאת הכוכבים
      return data?.zmanim?.tzeit7085deg || null;
    } catch (e) {
      this.logger.error('Failed to fetch Zmanim from Hebcal');
      return null;
    }
  }

  async getOmerData(): Promise<OmerData | null> {
    try {
      const { data } = await axios.get('https://www.hebcal.com/hebcal?v=1&cfg=json&o=on');
      const item = data.items?.find((i: any) => i.category === 'omer');
      
      if (!item) return null;

      const dayMatch = item.title.match(/\d+/);
      return {
        day: dayMatch ? dayMatch[0] : '',
        hebrew: item.hebrew
      };
    } catch (e) {
      this.logger.error('Failed to fetch Omer data');
      return null;
    }
  }
}