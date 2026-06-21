import { join } from 'path';

export interface BotConfig {
  OWNER_NUMBER: string;
  PORT: number;
  EARLY_SEND_TIME: string;
  SHABBAT_PROTECTION_TIME: string;
  STARTUP_PULSE_MINUTES: number;
  MIZMOR_TOTAL_FILES: number; // כאן הגדרת רמה ראשית
  MIZMOR_LINK: string; // כאן הגדרת רמה ראשית

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
    ASSETS_MIZMOR: string;
    MIZMOR_STATE: string;
  };
}

export const CONFIG: BotConfig = {
  OWNER_NUMBER: process.env.OWNER_NUMBER || '972533011599@c.us',
  PORT: parseInt(process.env.PORT || '3000', 10),

  EARLY_SEND_TIME: process.env.EARLY_SEND_TIME || '17:30',
  SHABBAT_PROTECTION_TIME: process.env.SHABBAT_PROTECTION_TIME || '19:01',
  STARTUP_PULSE_MINUTES: 10,

  // העברתי אותם לכאן, לרמה הראשית כפי שמופיע ב-Interface
  MIZMOR_TOTAL_FILES: 40,
  MIZMOR_LINK: process.env.MIZMOR_LINK || 'https://chat.whatsapp.com/your-link',

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
    ASSETS_MIZMOR: join(process.cwd(), 'assets', 'mizmor'),
    MIZMOR_STATE: join(process.cwd(), 'mizmor-state.json'),
  },
};
