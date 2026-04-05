import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger('WhatsappService');
  private isConnected = false;
  private isInitializing = false;
  private readonly ownerNumber = '972533011599@c.us';

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.isConnected = false;

    this.logger.log('🛠️ מתחיל תהליך חיבור (Force Connection Mode)...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'omer-bot-session',
        dataPath: './.wwebjs_auth',
      }),
      authTimeoutMs: 90000,
      qrMaxRetries: 15,
      webVersionCache: {
        type: 'remote',
        remotePath:
          'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;

      this.logger.log('📢 הופק QR חדש לסריקה!');
      console.log(qrLink);

      qrcode.generate(qr, { small: true });
      this.isInitializing = false;
    });

    this.client.on('authenticated', () => {
      this.logger.log('🔓 האימות (Authenticated) עבר בהצלחה! ממתין ל-Ready...');
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅✅✅ וואטסאפ READY! הבוט מחובר סופית.');

      await this.client
        .sendMessage(this.ownerNumber, '🚀 מני, אני חי, מחובר ומוכן לספירה!')
        .catch((err) => {
          this.logger.error(`❌ שגיאה בשליחת הודעת Ready: ${err.message}`);
        });
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error(`❌ כשל באימות (Auth Failure): ${msg}`);
      this.handleRestart();
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn(`❌ וואטסאפ התנתק: ${reason}`);
      this.handleRestart();
    });

    try {
      await this.client.initialize();
    } catch (err) {
      this.logger.error(`❌ שגיאה קריטית באתחול: ${err.message}`);
      this.handleRestart();
    }
  }

  private async handleRestart() {
    if (this.isInitializing) return;
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('🔄 מבצע אתחול מחדש בעוד 30 שניות...');
    try {
      await this.client.destroy();
    } catch (e) {}
    setTimeout(() => this.initializeClient(), 30000);
  }

  async sendMessage(to: string, body: string) {
    if (!this.isConnected) {
      this.logger.warn(
        `⚠️ ניסיון שליחה ל-${to} נחסם: הבוט עדיין לא בסטטוס READY`,
      );
      return;
    }
    try {
      await this.client.sendMessage(to, body);
      this.logger.log(`📧 הודעה נשלחה בהצלחה ל: ${to}`);
    } catch (e) {
      this.logger.error(`❌ שגיאה בשליחת הודעה: ${e.message}`);
      if (e.message.includes('Frame') || e.message.includes('detached')) {
        this.handleRestart();
      }
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
        await this.client.sendMessage(groupId, media, { caption });
        this.logger.log(`✅ תמונת יום ${dayNumber} נשלחה לקבוצה ${groupId}`);
      } else {
        await this.client.sendMessage(groupId, caption);
        this.logger.warn(`⚠️ תמונה חסרה (יום ${dayNumber}), נשלח טקסט בלבד.`);
      }
    } catch (e) {
      this.logger.error(`❌ שגיאה בשליחת הודעת עומר: ${e.message}`);
      if (e.message.includes('Frame')) this.handleRestart();
    }
  }
}
