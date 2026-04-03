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
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      puppeteer: { 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined 
      }
    });
  }

  onModuleInit() {
    this.client.on('qr', (qr) => {
      this.logger.log('New QR Code generated. Scan it from the logs:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      this.logger.log('Authenticated successfully!');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.log('✅ WhatsApp is Ready and Running on Server!');
    });

    this.client.on('message_create', async (msg) => {
      if (msg.fromMe) {
        const chat = await msg.getChat();
        if (chat.isGroup) {
          this.logger.log(`[ID HUNTER] Group: ${chat.name} | ID: ${chat.id._serialized}`);
        }
      }
    });

    this.client.initialize().catch(err => {
      this.logger.error('Initialization error:', err);
    });
  }

  async sendOmerMessage(groupId: string, dayNumber: string, caption: string) {
    if (!this.isConnected) {
      this.logger.error('Cannot send: Client not ready');
      return;
    }

    try {
      const imagePath = join(process.cwd(), 'assets', 'omer', `${dayNumber}.jpg`);
      
      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await this.client.sendMessage(groupId, media, { caption });
        this.logger.log(`Success: Sent image for day ${dayNumber} to ${groupId}`);
      } else {
        await this.client.sendMessage(groupId, caption);
        this.logger.log(`Success: Sent text only for day ${dayNumber} to ${groupId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send to ${groupId}: ${error.message}`);
    }
  }
}