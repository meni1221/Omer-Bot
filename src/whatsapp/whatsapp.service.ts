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

    this.logger.log('🛠️ מתחיל תהליך חיבור לוואטסאפ...');

    this.client = new Client({
      authStrategy: new LocalAuth(),
      webVersionCache: {
        type: 'remote',
        remotePath:
          'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      puppeteer: {
        headless: true,
        protocolTimeout: 0,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
          '--disable-renderer-backgrounding',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      this.logger.log('📢 התקבל QR חדש לסריקה!');
      qrcode.generate(qr, { small: true });
      this.isInitializing = false;
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅ וואטסאפ מחובר ומוכן לעבודה!');
      await this.client
        .sendMessage(this.ownerNumber, '🚀 מני, הבוט מחובר ומוכן!')
        .catch(() => {});
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn(`❌ וואטסאפ התנתק: ${reason}`);
      this.handleRestart();
    });

    try {
      await this.client.initialize();
    } catch (err) {
      this.logger.error(`❌ שגיאה באתחול: ${err.message}`);
      this.handleRestart();
    }
  }

  private async handleRestart() {
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('🔄 מבצע אתחול מחדש ל-Client בעוד 15 שניות...');
    try {
      await this.client.destroy();
    } catch (e) {}
    setTimeout(() => this.initializeClient(), 15000);
  }

  async sendMessage(to: string, body: string) {
    if (!this.isConnected) {
      this.logger.warn(`⚠️ ניסיון שליחה ל-${to} נכשל: אין חיבור`);
      return;
    }
    try {
      await this.client.sendMessage(to, body);
      this.logger.log(`📧 הודעה נשלחה בהצלחה ל: ${to}`);
    } catch (e) {
      this.logger.error(`❌ שגיאה בשליחה ל-${to}: ${e.message}`);
      if (e.message.includes('Frame')) this.handleRestart();
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
      this.logger.log(`📸 מנסה לשלוח יום ${dayNumber} לקבוצה ${groupId}...`);

      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await this.client.sendMessage(groupId, media, { caption });
        this.logger.log(`✅ תמונה וטקסט נשלחו לקבוצה ${groupId}`);
      } else {
        await this.client.sendMessage(groupId, caption);
        this.logger.warn(`⚠️ קובץ תמונה ${dayNumber}.jpg חסר, נשלח טקסט בלבד`);
      }
    } catch (e) {
      this.logger.error(`❌ שגיאת עומר בקבוצה ${groupId}: ${e.message}`);
      if (e.message.includes('Frame')) this.handleRestart();
    }
  }
}
