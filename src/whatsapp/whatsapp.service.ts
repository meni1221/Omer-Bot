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
    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ];

    this.client = new Client({
      authStrategy: new LocalAuth(),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      puppeteer: {
        headless: true,
        args: puppeteerArgs,
        // בשרת Render הכרום מותקן בנתיב מסוים אחרי הפקודה npx puppeteer browsers install chrome
        executablePath: process.platform === 'linux' 
          ? '/opt/render/.cache/puppeteer/chrome/linux-125.0.6422.60/chrome-linux64/chrome' 
          : undefined, 
      }
    });
  }

  async onModuleInit(): Promise<void> {
    this.client.on('qr', (qr: string) => {
      this.logger.log('--- SCAN THIS QR CODE IN YOUR LOGS ---');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      this.logger.log('Authenticated successfully!');
    });

    this.client.on('auth_failure', (msg: string) => {
      this.logger.error(`Authentication failure: ${msg}`);
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.log('✅ WhatsApp Client is Ready!');
    });

    // צייד ID - עוזר למצוא ID של קבוצות חדשות מהלוגים
    this.client.on('message_create', async (msg) => {
      if (msg.fromMe) {
        const chat = await msg.getChat();
        if (chat.isGroup) {
          this.logger.log(`[ID HUNTER] Group: ${chat.name} | ID: ${chat.id._serialized}`);
        }
      }
    });

    this.logger.log('Initializing WhatsApp Client...');
    this.client.initialize().catch(err => {
      this.logger.error('Client Initialization Error:', err);
    });
  }

  async sendOmerMessage(groupId: string, dayNumber: string, caption: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.error('Failed to send: Client not connected');
      return;
    }

    try {
      const imagePath = join(process.cwd(), 'assets', 'omer', `${dayNumber}.jpg`);
      
      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await this.client.sendMessage(groupId, media, { caption });
        this.logger.log(`Successfully sent Day ${dayNumber} image to ${groupId}`);
      } else {
        await this.client.sendMessage(groupId, caption);
        this.logger.log(`Image ${dayNumber}.jpg not found. Sent text only to ${groupId}`);
      }
    } catch (error) {
      this.logger.error(`Error sending message to ${groupId}: ${error.message}`);
    }
  }
}