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
        ],
      },
    });

    this.client.on('qr', (qr) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      this.logger.log('📢 QR חדש לסריקה!');
      console.log(qrLink); // הקישור המקורי שלך
      this.isInitializing = false;
    });

    this.client.on('authenticated', () => {
      this.logger.log('🔓 אימות בוצע בטלפון! מבצע סנכרון סופי...');
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅✅✅ READY! הבוט מחובר ופעיל.');

      // שליחת הודעת בדיקה מלאה (טקסט + תמונה) ישר בעלייה
      await this.sendTestToMeni('🚀 *מני, התחברתי בהצלחה!* הנה בדיקת הרצה:');
    });

    try {
      await this.client.initialize();
    } catch (err) {
      this.logger.error(`❌ שגיאה באתחול: ${err.message}`);
      this.handleRestart();
    }
  }

  // סימן חיים שעתי הכולל את התמונה של אותו יום
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyCheck() {
    if (this.isConnected) {
      await this.sendTestToMeni('🟢 *סימן חיים שעתי:* הבוט פעיל.');
    }
  }

  // פונקציית בדיקה ששולחת אליך את ההודעה המלאה (טקסט + תמונה מהתיקייה)
  private async sendTestToMeni(statusTitle: string) {
    try {
      const omer = await this.omerService.getOmerData();
      const zmanRaw = await this.omerService.getZmanim();
      const day = omer?.day || '1';
      const currentTime = new Date().toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const targetTime = zmanRaw
        ? new Date(zmanRaw).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '19:27';

      const imagePath = join(process.cwd(), 'assets', 'omer', `${day}.jpg`);
      const caption = `${statusTitle}\nשעה: *${currentTime}*\nזמן יעד להיום: *${targetTime}*`;

      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);

        await new Promise((resolve) => setTimeout(resolve, 2500));

        await this.client.sendMessage(this.ownerNumber, media, { caption });
      } else {
        await this.client.sendMessage(
          this.ownerNumber,
          `${caption}\n⚠️ *תמונה לא נמצאה בנתיב:* ${imagePath}`,
        );
      }
    } catch (e) {
      this.logger.error('Test send failed: ' + e.message);
    }
  }

  async sendOmerMessage(groupId: string, dayNumber: string, caption: string) {
    if (!this.isConnected) return;
    try {
      const imagePath = join(
        process.cwd(),
        'assets',
        'omer',
        `${dayNumber}.jpg`,
      );
      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);

        await new Promise((resolve) => setTimeout(resolve, 2500));

        await this.client.sendMessage(groupId, media, { caption });
        // עדכון אליך שהשליחה לקבוצה בוצעה
        await this.client.sendMessage(
          this.ownerNumber,
          `✅ הודעת יום ${dayNumber} הופצה בהצלחה לכל הקבוצות.`,
        );
      } else {
        await this.client.sendMessage(groupId, caption);
        await this.client.sendMessage(
          this.ownerNumber,
          `⚠️ נשלח טקסט בלבד לקבוצות (תמונה חסרה).`,
        );
      }
    } catch (e) {
      this.logger.error(`❌ שגיאה בעומר: ${e.message}`);
      await this.client.sendMessage(
        this.ownerNumber,
        `❌ תקלה בשליחה: ${e.message}`,
      );
    }
  }

  private async handleRestart() {
    if (this.isInitializing) return;
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('🔄 אתחול מחדש בעוד 20 שניות...');
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
      }
    }
  }
}
