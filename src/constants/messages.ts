export const MESSAGES = {
  OMER_FOOTER: `\n\n*ספירת העומר*\n\n📢 הצטרפו לתזכורת :\nhttps://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a\n\nתזכו למצוות! 🤖\n_שימו לב שעברנו לעבודה עם רובוט_`,

  GREETINGS: {
    SHABBAT: 'שבת שלום! 🍷',
    HOLIDAY: 'חג שמח! 🥂',
    EARLY_PREFIX: '🕯️ *תזכורת מוקדמת:*',
    HALACHIC_WARNING: '\n\n⚠️ *שימו לב:* זו תזכורת מוקדמת לכבוד החג/שבת. את הספירה יש לבצע רק בלילה (אחרי צאת הכוכבים)!',
  },

  STARTUP_REPORT: (current: number, total: number, dayType: string, target: string) =>
    `⚡ *דיווח התנעה (${current}/${total}):* הבוט פעיל.\n` +
    `📅 סוג יום: *${dayType}*\n` +
    `🕒 זמן שליחה מתוכנן: *${target}*`,

  HOURLY_REPORT: (dayType: string, target: string, status: string) =>
    `🕒 *עדכון שעתי - בוט העומר:*\n` +
    `📅 סוג יום: *${dayType}*\n` +
    `🎯 זמן יעד: *${target}*\n` +
    `📊 סטטוס: *${status}*`,

  GET_FULL_CAPTION: (prefix: string) => `${prefix}${MESSAGES.OMER_FOOTER}`
};