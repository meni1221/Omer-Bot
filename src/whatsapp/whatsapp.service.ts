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
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
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
      this.logger.log('--- QR CODE READY ---');
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      console.log('\x1b[36m%s\x1b[0m', '👉 Open this link to scan:');
      console.log(qrLink);
      
      // הצגת ה-QR גם בתוך הטרמינל/לוגים
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.logger.log('✅ WhatsApp Client is Ready!');
      
      try {
        await this.client.sendMessage(this.ownerNumber, '🚀 מני, הבוט רץ ומחובר!');
      } catch (e) {
        this.logger.error('Failed to send startup message');
      }
    });

    this.client.on('authenticated', () => {
      this.logger.log('🔓 Authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('❌ Authentication failure:', msg);
    });

    this.client.initialize().catch((err) => {
      this.logger.error('Client Initialization Error:', err);
    });
  }

  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.sendMessage(to, body);
      this.logger.log(`Message sent to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
    }
  }

  async sendOmerMessage(groupId: string, dayNumber: string, caption: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      const imagePath = join(process.cwd(), 'assets', 'omer', `${dayNumber}.jpg`);
      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await this.client.sendMessage(groupId, media, { caption });
        this.logger.log(`Day ${dayNumber} image sent to ${groupId}`);
      } else {
        await this.client.sendMessage(groupId, caption);
        this.logger.warn(`Image missing for day ${dayNumber}, sent text only.`);
      }
    } catch (error) {
      this.logger.error(`Error in sendOmerMessage: ${error.message}`);
    }
  }
}