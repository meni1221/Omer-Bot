import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CONFIG } from '../config/bot.config';
import { HebcalOmerItem, OmerData } from '../interfaces/omer-data.interface';

interface HebcalEventItem {
  date: string;
  yomtov?: boolean;
}

interface HebcalZmanimResponse {
  times?: {
    sunset?: string;
  };
}

interface HebcalOmerResponse {
  items?: HebcalOmerItem[];
}

interface HebcalEventsResponse {
  items?: HebcalEventItem[];
}

@Injectable()
export class HebcalService {
  private readonly logger = new Logger(HebcalService.name);

  async getChabadOmerSendTimeIso(): Promise<string | null> {
    try {
      const { data } = await axios.get<HebcalZmanimResponse>(
        CONFIG.API_ENDPOINTS.ZMANIM,
        {
          params: {
            cfg: 'json',
            latitude: 32.084,
            longitude: 34.834,
            tzid: 'Asia/Jerusalem',
          },
          timeout: 10000,
        },
      );

      const sunsetIso = data.times?.sunset;
      if (!sunsetIso) {
        throw new Error('Sunset time not found in API response');
      }

      const sunsetDate = new Date(sunsetIso);
      const chabadZman = new Date(sunsetDate.getTime() + 24 * 60 * 1000);

      this.logger.debug(
        `Sunset: ${sunsetIso} | Target: ${chabadZman.toISOString()}`,
      );
      return chabadZman.toISOString();
    } catch (error) {
      this.logger.error(`Hebcal Zmanim Error: ${(error as Error).message}`);
      return null;
    }
  }

  async getTodayOmerData(): Promise<OmerData | null> {
    try {
      const todayIso = this.getTodayIsoDate();
      const { data } = await axios.get<HebcalOmerResponse>(
        CONFIG.API_ENDPOINTS.OMER_DATA,
        {
          params: {
            v: 1,
            cfg: 'json',
            o: 'on',
            start: todayIso,
            end: todayIso,
          },
          timeout: 10000,
        },
      );

      const item = data.items?.find((event) => event.category === 'omer');

      if (!item) {
        this.logger.warn(`No Omer data found for date: ${todayIso}`);
        return null;
      }

      const dayMatch = item.title.match(/\d+/);
      const dayNumber = dayMatch
        ? (parseInt(dayMatch[0], 10) + 1).toString()
        : '1';

      this.logger.log(`Fetched Omer: Day ${dayNumber} (${item.hebrew})`);
      return { day: dayNumber, hebrew: item.hebrew };
    } catch (error) {
      this.logger.error(`Omer Data Fetch Error: ${(error as Error).message}`);
      return null;
    }
  }

  async isTodayYomTov(): Promise<boolean> {
    try {
      const todayIso = this.getTodayIsoDate();
      const { data } = await axios.get<HebcalEventsResponse>(
        CONFIG.API_ENDPOINTS.OMER_DATA,
        {
          params: {
            v: 1,
            cfg: 'json',
            maj: 'on',
            min: 'on',
            mod: 'on',
            nx: 'on',
            year: 'now',
            month: 'now',
            ss: 'on',
            mf: 'on',
            c: 'on',
            geo: 'pos',
            zip: '70900',
            m: 50,
            s: 'on',
          },
          timeout: 10000,
        },
      );

      return Boolean(
        data.items?.some((item) => item.date === todayIso && item.yomtov),
      );
    } catch (error) {
      this.logger.error(`Hebcal Holiday Error: ${(error as Error).message}`);
      return false;
    }
  }

  private getTodayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
