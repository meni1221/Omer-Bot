import { join } from 'path';

export interface BotConfig {
  OWNER_NUMBER: string;
  PORT: number;
  EARLY_SEND_TIME: string;
  SHABBAT_PROTECTION_TIME: string;
  STARTUP_PULSE_MINUTES: number;
  
  DELAY: {
    MIN: number;
    MAX: number;
  };

  API_ENDPOINTS: {
    ZMANIM: string;
    OMER_DATA: string;
  };
  
  PATHS: {
    STATE_FILE: string;
    AUTH_DIR: string;
    ASSETS_OMER: string;
  };
}

export const CONFIG: BotConfig = {
  OWNER_NUMBER: process.env.OWNER_NUMBER || '972533011599@c.us',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  EARLY_SEND_TIME: process.env.EARLY_SEND_TIME || '17:30',
  SHABBAT_PROTECTION_TIME: process.env.SHABBAT_PROTECTION_TIME || '19:01',
  STARTUP_PULSE_MINUTES: 10,

  DELAY: {
    MIN: 3500,
    MAX: 8000,
  },

  API_ENDPOINTS: {
    ZMANIM: 'https://www.hebcal.com/zmanim',
    OMER_DATA: 'https://www.hebcal.com/hebcal',
  },

  PATHS: {
    STATE_FILE: join(process.cwd(), 'bot-state.json'),
    AUTH_DIR: join(process.cwd(), '.wwebjs_auth'),
    ASSETS_OMER: join(process.cwd(), 'assets', 'omer'),
  },
};