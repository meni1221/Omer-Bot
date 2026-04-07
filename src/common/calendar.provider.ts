import { Injectable } from '@nestjs/common';
import { HOLIDAY_EVES_2026 } from '../constants/calendar';

@Injectable()
export class CalendarProvider {
  getCurrentStatus() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const dayOfWeek = now.getDay();

    const isFriday = dayOfWeek === 5;
    const isHolidayEve = HOLIDAY_EVES_2026.includes(dateStr);
    
    let dayTypeLabel = 'יום חול ☀️';
    let dayType: 'WEEKDAY' | 'SHABBAT_EVE' | 'HOLIDAY_EVE' = 'WEEKDAY';

    if (isFriday) {
      dayType = 'SHABBAT_EVE';
      dayTypeLabel = 'ערב שבת 🕯️';
    } else if (isHolidayEve) {
      dayType = 'HOLIDAY_EVE';
      dayTypeLabel = 'ערב חג 🍷';
    }

    return {
      isEarlyDay: isFriday || isHolidayEve,
      isShabbat: dayOfWeek === 6,
      dayType,
      dayTypeLabel
    };
  }

  getIsraelTime(): string {
    return new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jerusalem',
    });
  }
}