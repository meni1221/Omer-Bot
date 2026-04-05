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

    this.logger.log('🛠️ ניסיון חיבור אגרסיבי (Optimized for Railway)...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'omer-bot-session',
        dataPath: './.wwebjs_auth',
      }),
      authTimeoutMs: 90000,
      qrMaxRetries: 20,
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
          '--disable-renderer-backgrounding',
          '--disable-canvas-aa',
          '--disable-2d-canvas-clip-utils',
          '--disable-gl-drawing-for-tests',
          '--disable-extensions',
          '--blink-settings=imagesEnabled=false',
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

      await this.client
        .sendMessage(
          this.ownerNumber,
          '🚀 מני, התחברתי בהצלחה! הבוט מוכן לספירה.',
        )
        .catch(() => {});
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error(`❌ כשל באימות: ${msg}`);
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
    if (!this.isConnected) {
      this.logger.warn(`⚠️ שליחה ל-${to} נכשלה: בוט לא READY`);
      return;
    }
    try {
      await this.client.sendMessage(to, body);
      this.logger.log(`📧 נשלח ל: ${to}`);
    } catch (e) {
      this.logger.error(`❌ שגיאה בשליחה: ${e.message}`);
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
      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await this.client.sendMessage(groupId, media, { caption });
      } else {
        await this.client.sendMessage(groupId, caption);
      }
    } catch (e) {
      this.logger.error(`❌ שגיאה בעומר: ${e.message}`);
    }
  }
}
