export type DayType = 'WEEKDAY' | 'SHABBAT_EVE' | 'HOLIDAY_EVE' | 'SHABBAT' | 'MOTZAEI_SHABBAT';

export interface CalendarStatus {
  isEarlyDay: boolean; // ימי שישי וערבי חג
  isShabbat: boolean;
  isMotzaeiShabbat: boolean;
  dayType: DayType;
  dayTypeLabel: string;
}