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

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.isConnected = false;

    this.logger.log('🛠️ Initializing WhatsApp Client...');

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
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // חשוב ל-Railway
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

    this.setupEventListeners();

    this.client.initialize().catch((err) => {
      this.logger.error('Client Init Error:', err);
      this.isInitializing = false;
    });
  }

  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      console.log('👉 QR Link:', qrLink);
      qrcode.generate(qr, { small: true });
      this.isInitializing = false;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅ WhatsApp Client is Ready!');
    });

    this.client.on('disconnected', async (reason) => {
      this.logger.warn(`WhatsApp disconnected: ${reason}`);
      this.handleRestart();
    });

    this.client.on('auth_failure', () => {
      this.logger.error('Auth failure, restarting...');
      this.handleRestart();
    });
  }

  private async handleRestart() {
    this.isConnected = false;
    this.isInitializing = false;
    try {
      await this.client.destroy();
    } catch (e) {}
    this.logger.log('🔄 Restarting Client in 5 seconds...');
    setTimeout(() => this.initializeClient(), 5000);
  }

  async onModuleInit(): Promise<void> {
    // האתחול קורה ב-Constructor
  }

  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Cannot send: Client not ready');
      return;
    }
    try {
      await this.client.sendMessage(to, body);
    } catch (error) {
      this.logger.error(`Send error: ${error.message}`);
      if (
        error.message.includes('detached Frame') ||
        error.message.includes('Session closed')
      ) {
        this.handleRestart();
      }
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
      this.logger.error(`Omer send error: ${error.message}`);
      if (error.message.includes('detached Frame')) this.handleRestart();
    }
  }
}
