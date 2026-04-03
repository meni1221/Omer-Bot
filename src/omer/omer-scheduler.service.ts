import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from './omer.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OmerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OmerSchedulerService.name);
  private targetTime: string | null = null;
  private readonly ownerNumber = '972533011599@c.us';

  private readonly groups: string[] = [
    '120363301374326202@g.us',
    '120363267001121815@g.us',
    '120363120170653605@g.us',
    '120363426577586940@g.us',
  ];

  constructor(
    private readonly omerService: OmerService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Omer Scheduler (TS) initialized. Calculating target time...');
    await this.updateDailyTarget('Initialization');
  }

 // דגימה וחישוב ב-12:00 בצהריים שעון ישראל
  @Cron('0 0 12 * * *', { timeZone: 'Asia/Jerusalem' })
  async handleNoonCheck(): Promise<void> {
    await this.updateDailyTarget('דגימת 12:00');
  }

  // דגימה וחישוב חוזר ב-16:00 בצהריים שעון ישראל
  @Cron('0 7 16 * * *', { timeZone: 'Asia/Jerusalem' })
  async handleAfternoonCheck(): Promise<void> {
    await this.updateDailyTarget('בדיקה חוזרת 16:00');
  }

  // פונקציית הליבה לעדכון זמן היעד
  async updateDailyTarget(source: string): Promise<void> {
    const zmanIso = await this.omerService.getZmanim();
    if (zmanIso) {
      // חילוץ שעה ודקה (HH:mm)
      this.targetTime = new Date(zmanIso).getUTCHours().toString().padStart(2, '0') + ':' + 
                        new Date(zmanIso).getUTCMinutes().toString().padStart(2, '0');
      
      const logMsg = `Target time set to: ${this.targetTime} UTC (Tzeit HaKochavim)`;
      this.logger.log(`[${source}] ${logMsg}`);

      // שליחת עדכון למני לוואטסאפ
      await this.whatsappService.sendMessage(
        this.ownerNumber, 
        `🔍 ${source}: זמן השליחה להיום נקבע ל-${this.targetTime} (UTC).`
      );
    }
  }

  // בדיקה כל דקה האם הגיע הזמן או האם אנחנו 10 דקות לפני
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSend(): Promise<void> {
    if (!this.targetTime) return;

    const now = new Date();
    const currentTime = now.getUTCHours().toString().padStart(2, '0') + ':' + 
                        now.getUTCMinutes().toString().padStart(2, '0');

    // חישוב זמן של 10 דקות לפני
    const targetDate = new Date();
    const [targetH, targetM] = this.targetTime.split(':').map(Number);
    targetDate.setUTCHours(targetH, targetM, 0, 0);
    
    const tenMinutesBeforeDate = new Date(targetDate.getTime() - 10 * 60000);
    const tenMinutesBeforeTime = tenMinutesBeforeDate.getUTCHours().toString().padStart(2, '0') + ':' + 
                                 tenMinutesBeforeDate.getUTCMinutes().toString().padStart(2, '0');

    // 1. התראת 10 דקות לפני
    if (currentTime === tenMinutesBeforeTime) {
      await this.whatsappService.sendMessage(
        this.ownerNumber,
        `🔔 מני, בעוד 10 דקות בדיוק הודעת העומר תישלח לכל הקבוצות!`
      );
    }

    // 2. זמן השליחה האמיתי
    if (currentTime === this.targetTime) {
      this.logger.log('✨ Tzeit HaKochavim reached! Executing sequence...');
      await this.sendDailyUpdate();
      
      // שליחת אישור סופי למני
      await this.whatsappService.sendMessage(this.ownerNumber, `✅ הודעות העומר נשלחו בהצלחה לכל הקבוצות.`);
      
      this.targetTime = null; // מניעת שליחה חוזרת
    }
  }

  private async sendDailyUpdate(): Promise<void> {
    const data = await this.omerService.getOmerData();

    if (data && data.day) {
      const caption =
        `*ספירת העומר - הלילה ${data.day} ימים:*\n` +
        `${data.hebrew}\n\n` +
        `📢 להצטרפות לתזכורות יומיות:\n` +
        `https://chat.whatsapp.com/I8bONiOPYoi8a7QnYT9p5a?mode=gi_t\n\n` +
        `תזכו למצוות! 🕯️`;

      for (const groupId of this.groups) {
        try {
          await this.whatsappService.sendOmerMessage(groupId, data.day, caption);
        } catch (err) {
          this.logger.error(`Failed to send to group ${groupId}: ${err.message}`);
        }
      }
    }
  }
}