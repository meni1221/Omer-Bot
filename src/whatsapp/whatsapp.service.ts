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
  private readonly ownerNumber = '972533011599@c.us';

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
        protocolTimeout: 60000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
        ],
      },
    });
  }

  async onModuleInit(): Promise<void> {
    this.client.on('qr', (qr: string) => {
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

  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.sendMessage(to, body);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
    }
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
      this.logger.error(`Error in sendOmerMessage: ${error.message}`);
    }
  }
}
