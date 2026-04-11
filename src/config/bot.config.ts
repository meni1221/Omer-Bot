export interface BotConfig {
  /** מספר הוואטסאפ של מנהל המערכת לקבלת דיווחים */
  OWNER_NUMBER: string;
  /** שעת שליחה מוקדמת בימי שישי וערבי חג */
  EARLY_SEND_TIME: string;
  /** שעה ממנה אין לשלוח הודעות ביום שישי (כניסת שבת/הגנה) */
  SHABBAT_PROTECTION_TIME: string;
  /** מספר הדקות לאחר ההתנעה שבהן יישלח דיווח "דופק" (Heartbeat) למנהל */
  STARTUP_PULSE_MINUTES: number;
  /** הגדרות API חיצוניות (למשל עבור זמני היום) */
  API_ENDPOINTS: {
    ZMANIM: string;
    OMER_DATA: string;
  };
}

export const CONFIG: BotConfig = {
  OWNER_NUMBER: '972533011599@c.us',
  EARLY_SEND_TIME: '17:30',
  SHABBAT_PROTECTION_TIME: '19:01',
  STARTUP_PULSE_MINUTES: 10,
  API_ENDPOINTS: {
    ZMANIM: 'https://www.hebcal.com/zmanim',
    OMER_DATA: 'https://www.hebcal.com/etc/hdate-he.json',
  },
};
