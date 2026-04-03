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

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
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
        ],
      },
    });
  }

  async onModuleInit(): Promise<void> {
    this.client.on('qr', (qr: string) => {
      this.logger.log('--- SCAN QR CODE ---');
      
      // 1. מדפיס קישור לסריקה קלה בדפדפן (הפתרון לבעיית הטרמינל ב-Railway)
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      console.log('\x1b[36m%s\x1b[0m', '👉 Open this link to scan:'); // מדפיס בכחול
      console.log(qrImageUrl);
      console.log('\n');

      // 2. גיבוי: ה-QR המקורי בטרמינל
      qrcode.generate(qr, { small: true });
    });
  }

  async sendOmerMessage(
    groupId: string,
    dayNumber: string,
    caption: string,
  ): Promise<void> {
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
    } catch (error) {
      this.logger.error(`Error sending: ${error.message}`);
    }
  }
}
