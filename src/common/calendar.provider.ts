// src/common/calendar.provider.ts
import { Injectable } from '@nestjs/common';
import { HOLIDAY_EVES_2026 } from '../constants/calendar';
import { CalendarStatus, DayType } from 'src/interfaces/calendar-status.interface';

@Injectable()
export class CalendarProvider {
  /**
   * מחזיר אובייקט מצב מלא על היום הנוכחי
   */
  getCurrentStatus(targetTime?: string): CalendarStatus {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const dayOfWeek = now.getDay();
    const currentTime = this.getIsraelTime();

    const isFriday = dayOfWeek === 5;
    const isHolidayEve = HOLIDAY_EVES_2026.includes(dateStr);
    const isShabbat = dayOfWeek === 6;

    // זיהוי מוצאי שבת: יום שבת אחרי שעת היעד (אם סופקה)
    const isMotzaeiShabbat =
      isShabbat && targetTime ? currentTime >= targetTime : false;

    const { type, label } = this.resolveDayType(
      isFriday,
      isHolidayEve,
      isShabbat,
      isMotzaeiShabbat,
    );

    return {
      isEarlyDay: isFriday || isHolidayEve,
      isShabbat,
      isMotzaeiShabbat,
      dayType: type,
      dayTypeLabel: label,
    };
  }

  /**
   * מחזיר את השעה הנוכחית בישראל בפורמט HH:mm
   */
  getIsraelTime(): string {
    return new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jerusalem',
    });
  }

  private resolveDayType(
    isFriday: boolean,
    isHolidayEve: boolean,
    isShabbat: boolean,
    isMotzaeiShabbat: boolean,
  ): { type: DayType; label: string } {
    if (isFriday) return { type: 'SHABBAT_EVE', label: 'ערב שבת 🕯️' };
    if (isHolidayEve) return { type: 'HOLIDAY_EVE', label: 'ערב חג 🍷' };
    if (isMotzaeiShabbat)
      return { type: 'MOTZAEI_SHABBAT', label: 'מוצאי שבת ✨' };
    if (isShabbat) return { type: 'SHABBAT', label: 'שבת קודש 🕍' };
    return { type: 'WEEKDAY', label: 'יום חול ☀️' };
  }
}
