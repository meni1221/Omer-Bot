import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);
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
          '--disable-renderer-backgrounding', // מונע מהדף "להירדם"
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      console.log('👉 QR Link:', qrLink);
      // qrcode.generate(qr, { small: true });
      this.isInitializing = false;
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅ Connected!');
      // שליחה שקטה של הודעת התנעה
      this.client
        .sendMessage(this.ownerNumber, '🚀 הבוט התחבר מחדש.')
        .catch(() => {});
    });

    this.client.on('disconnected', () => this.handleRestart());

    try {
      await this.client.initialize();
    } catch (err) {
      this.handleRestart();
    }
  }

  private async handleRestart() {
    if (this.isInitializing) return;
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('🔄 Frame detached or Session lost. Restarting...');
    try {
      await this.client.destroy();
    } catch (e) {}
    setTimeout(() => this.initializeClient(), 10000);
  }

  async sendMessage(to: string, body: string) {
    if (!this.isConnected) return;
    try {
      await this.client.sendMessage(to, body);
    } catch (e) {
      this.logger.error(`Send error: ${e.message}`);
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
      } else {
        await this.client.sendMessage(groupId, caption);
      }
    } catch (e) {
      if (e.message.includes('Frame')) this.handleRestart();
    }
  }
}
