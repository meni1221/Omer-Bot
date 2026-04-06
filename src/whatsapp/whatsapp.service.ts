import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { join } from 'path';
import { existsSync } from 'fs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmerService } from 'src/omer/omer.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger('WhatsappService');
  private isConnected = false;
  private isInitializing = false;
  private readonly ownerNumber = '972533011599@c.us';

  constructor(private readonly omerService: OmerService) {}

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.isConnected = false;

    this.logger.log('🛠️ ניסיון חיבור אגרסיבי (Optimized for Railway)...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'omer-bot-v3',
        dataPath: './.wwebjs_auth',
      }),
      authTimeoutMs: 0,
      qrMaxRetries: 30,
      takeoverOnConflict: true,
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-infobars',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--maximum-memory=512MB', // הגבלת זיכרון לדפדפן עצמו
        ],
      },
    });

    this.client.on('qr', (qr) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      this.logger.log('📢 QR חדש לסריקה!');
      console.log(qrLink);
      this.isInitializing = false;
    });

    this.client.on('authenticated', () => {
      this.logger.log('🔓 אימות בוצע בטלפון! מבצע סנכרון סופי...');
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅✅✅ READY! הבוט מחובר ופעיל.');
      await this.sendTestToMeni('🚀 *מני, התחברתי בהצלחה!* הנה בדיקת הרצה:');
    });

    try {
      await this.client.initialize();
    } catch (err) {
      this.logger.error(`❌ שגיאה באתחול: ${err.message}`);
      this.handleRestart();
    }
  }

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'hourlyCheck',
    timeZone: 'Asia/Jerusalem',
  })
  async hourlyCheck() {
    // בדיקה אם הבוט באמת מחובר ואקטיבי
    if (!this.isConnected || !this.client) {
      this.logger.warn('⚠️ בוט לא מחובר בבדיקה השעתית. מנסה לאתחל...');
      this.handleRestart();
      return;
    }

    try {
      this.logger.log('⏰ מפעיל בדיקת סימן חיים שעתי (ישראל)...');
      await this.sendTestToMeni('🟢 *סימן חיים שעתי:* הבוט פעיל.');
    } catch (e) {
      this.logger.error('❌ קריסה בסימן חיים: ' + e.message);
      if (e.message.includes('detached') || e.message.includes('closed')) {
        this.handleRestart();
      }
    }
  }

  private getCalculatedOmerDay(): number {
    const startDate = new Date('2026-04-02');
    const now = new Date();
    const start = Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  private async sendTestToMeni(statusTitle: string) {
    try {
      // בדיקה שהדפדפן לא קרס לפני שליחת מדיה
      if (!this.client?.pupPage || this.client.pupPage.isClosed()) {
        throw new Error('Puppeteer page is closed or detached');
      }

      const dayForTonight = this.getCalculatedOmerDay();
      const zmanRaw = await this.omerService.getZmanim();
      const now = new Date();
      const currentTime = now.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const targetTime = zmanRaw
        ? new Date(zmanRaw).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '19:28';

      const imagePath = join(
        process.cwd(),
        'assets',
        'omer',
        `${dayForTonight}.jpg`,
      );
      const caption = `${statusTitle}\n📅 בדיקה לערב יום: *${dayForTonight}* בעומר\n⏰ שעה: *${currentTime}*\n⏳ יעד שליחה: *${targetTime}*`;

      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        // השהייה מוגדלת למניעת קריסת פריים ב-Railway
        await new Promise((resolve) => setTimeout(resolve, 3500));
        await this.client.sendMessage(this.ownerNumber, media, { caption });
      } else {
        await this.client.sendMessage(
          this.ownerNumber,
          `${caption}\n⚠️ *תמונה ${dayForTonight}.jpg לא נמצאה!*`,
        );
      }
    } catch (e) {
      this.logger.error('Test send failed: ' + e.message);
      if (e.message.includes('detached') || e.message.includes('closed')) {
        this.handleRestart();
      }
    }
  }

  async sendOmerMessage(
    groupId: string,
    dayNumberFromApi: string,
    caption: string,
  ) {
    if (!this.isConnected) return;
    try {
      const dayNumber = this.getCalculatedOmerDay().toString();
      const imagePath = join(
        process.cwd(),
        'assets',
        'omer',
        `${dayNumber}.jpg`,
      );

      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await new Promise((resolve) => setTimeout(resolve, 3500));
        await this.client.sendMessage(groupId, media, { caption });

        await this.client.sendMessage(
          this.ownerNumber,
          `✅ הודעת יום ${dayNumber} הופצה בהצלחה לכל הקבוצות.`,
        );
      } else {
        await this.client.sendMessage(groupId, caption);
        await this.client.sendMessage(
          this.ownerNumber,
          `⚠️ נשלח טקסט בלבד (תמונה ${dayNumber}.jpg חסרה).`,
        );
      }
    } catch (e) {
      this.logger.error(`❌ שגיאה בעומר: ${e.message}`);
      await this.client.sendMessage(
        this.ownerNumber,
        `❌ תקלה בשליחה: ${e.message}`,
      );
      if (e.message.includes('detached') || e.message.includes('closed')) {
        this.handleRestart();
      }
    }
  }

  private async handleRestart() {
    if (this.isInitializing) return;
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn(
      '🔄 זיהיתי ניתוק פריים או קריסה. אתחול מחדש בעוד 20 שניות...',
    );
    try {
      await this.client.destroy();
    } catch (e) {}
    setTimeout(() => this.initializeClient(), 20000);
  }

  async sendMessage(to: string, body: string) {
    if (this.isConnected) {
      try {
        await this.client.sendMessage(to, body);
      } catch (e) {
        this.logger.error(`❌ שגיאה בשליחה: ${e.message}`);
        if (e.message.includes('detached')) this.handleRestart();
      }
    }
  }
}
