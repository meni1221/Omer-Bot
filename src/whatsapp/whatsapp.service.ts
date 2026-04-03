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
          '--disable-gpu',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
        ],
      },
    });
  }

  async onModuleInit(): Promise<void> {
    this.client.on('qr', (qr: string) => {
      this.logger.log('--- SCAN THIS QR CODE IN YOUR LOGS ---');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.log('✅ WhatsApp Client is Ready!');
    });

    this.client.initialize().catch((err) => {
      this.logger.error('Client Initialization Error:', err);
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
