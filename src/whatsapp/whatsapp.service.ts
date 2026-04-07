import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { join } from 'path';
import { existsSync } from 'fs';
import { CONFIG } from 'src/config/bot.config';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger('WhatsappService');
  private isConnected = false;
  private isInitializing = false;

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.isConnected = false;

    this.logger.log('🛠️ אתחול Whatsapp Client (Optimized for Production)...');

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
          '--disable-dev-shm-usage', // קריטי למניעת detached frame ב-Railway
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      this.logger.log('📢 QR חדש לסריקה!');
      console.log(qrLink);
      this.isInitializing = false;
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅✅✅ READY! הבוט מחובר ופעיל.');
    });

    try {
      await this.client.initialize();
    } catch (err) {
      this.logger.error(`❌ שגיאה באתחול: ${err.message}`);
      this.handleRestart();
    }
  }

  async sendMessage(to: string, body: string) {
    if (!this.isConnected) return;
    try {
      await this.client.sendMessage(to, body);
    } catch (e) {
      this.logger.error(`❌ שגיאה בשליחה: ${e.message}`);
      if (e.message.includes('detached')) this.handleRestart();
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
        await new Promise((resolve) => setTimeout(resolve, 3500));
        await this.client.sendMessage(groupId, media, { caption });

        await this.sendMessage(
          CONFIG.OWNER_NUMBER,
          `✅ הודעת יום ${dayNumber} הופצה בהצלחה.`,
        );
      } else {
        await this.client.sendMessage(groupId, caption);
        await this.sendMessage(
          CONFIG.OWNER_NUMBER,
          `⚠️ נשלח טקסט בלבד (תמונה ${dayNumber}.jpg חסרה).`,
        );
      }
    } catch (e) {
      this.logger.error(`❌ שגיאה בהפצת העומר: ${e.message}`);
      if (e.message.includes('detached') || e.message.includes('closed')) {
        this.handleRestart();
      }
    }
  }

  private async handleRestart() {
    if (this.isInitializing) return;
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('🔄 זיהיתי קריסה. אתחול מחדש בעוד 20 שניות...');
    try {
      await this.client.destroy();
    } catch (e) {}
    setTimeout(() => this.initializeClient(), 20000);
  }
}
