// src/omer/omer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CONFIG } from '../config/bot.config';
import { HebcalOmerItem, OmerData } from 'src/interfaces/omer-data.interface';

@Injectable()
export class OmerService {
  private readonly logger = new Logger(OmerService.name);

  /**
   * מחשב את זמן היעד לשליחה לפי שיטת חב"ד (שקיעה + 24 דקות)
   */
  async getZmanim(): Promise<string | null> {
    try {
      const { data } = await axios.get(CONFIG.API_ENDPOINTS.ZMANIM, {
        params: {
          cfg: 'json',
          latitude: 32.0840,
          longitude: 34.8340,
          tzid: 'Asia/Jerusalem',
        },
        timeout: 10000,
      });

      const sunsetIso = data?.times?.sunset;
      if (!sunsetIso) throw new Error('Sunset time not found in API response');

      const sunsetDate = new Date(sunsetIso);
      // הוספת 24 דקות לשקיעה (מנהג חב"ד בני ברק)
      const chabadZman = new Date(sunsetDate.getTime() + 24 * 60 * 1000);

      this.logger.debug(`Sunset: ${sunsetIso} | Target: ${chabadZman.toISOString()}`);
      return chabadZman.toISOString();
    } catch (error) {
      this.logger.error(`Hebcal Zmanim Error: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * מושך את נתוני ספירת העומר המדויקים להיום מה-API
   */
  async getOmerData(): Promise<OmerData | null> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const { data } = await axios.get(CONFIG.API_ENDPOINTS.OMER_DATA, {
        params: { v: 1, cfg: 'json', o: 'on', start: todayIso, end: todayIso }
      });

      const item: HebcalOmerItem = data.items?.find((i: HebcalOmerItem) => i.category === 'omer');

      if (!item) {
        this.logger.warn(`No Omer data found for date: ${todayIso}`);
        return null;
      }

      // חילוץ יום העומר מהטקסט (למשל "10th day of Omer") והוספת 1 עבור הלילה הבא
      const dayMatch = item.title.match(/\d+/);
      const dayNumber = dayMatch ? (parseInt(dayMatch[0], 10) + 1).toString() : '1';

      this.logger.log(`Fetched Omer: Day ${dayNumber} (${item.hebrew})`);

      return { day: dayNumber, hebrew: item.hebrew };
    } catch (error) {
      this.logger.error(`Omer Data Fetch Error: ${(error as Error).message}`);
      return null;
    }
  }
}