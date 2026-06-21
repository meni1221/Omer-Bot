import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { Client, MessageMedia, MessageSendOptions } from 'whatsapp-web.js';
import { CONFIG } from '../config/bot.config';
import { WhatsappAuthCleanupService } from './whatsapp-auth-cleanup.service';
import { WhatsappClientFactory } from './whatsapp-client.factory';
import { WhatsappDelayService } from './whatsapp-delay.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client!: Client;
  private readonly logger = new Logger(WhatsappService.name);
  private isConnected = false;
  private isInitializing = false;

  constructor(
    private readonly authCleanup: WhatsappAuthCleanupService,
    private readonly clientFactory: WhatsappClientFactory,
    private readonly delayService: WhatsappDelayService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeClient();
  }

  isClientReady(): boolean {
    return this.isConnected;
  }

  async sendMessage(
    to: string,
    body: string | MessageMedia,
    options?: MessageSendOptions,
  ): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Tried to send message while disconnected: ${to}`);
      return;
    }

    try {
      await this.client.sendMessage(to, body, options);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${(error as Error).message}`,
      );
      this.checkConnectionState((error as Error).message);
    }
  }

  async sendOmerMessage(
    groupId: string,
    dayNumber: string,
    caption: string,
  ): Promise<void> {
    if (!this.isConnected) return;

    try {
      const imagePath = join(CONFIG.PATHS.ASSETS_OMER, `${dayNumber}.jpg`);
      await this.delayService.waitBeforeSend();

      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await this.sendMessage(groupId, media, { caption });
        await this.sendMessage(CONFIG.OWNER_NUMBER, media, {
          caption: `Omer day ${dayNumber} was sent successfully to ${groupId}`,
        });
        return;
      }

      await this.sendMessage(groupId, caption);
      await this.sendMessage(
        CONFIG.OWNER_NUMBER,
        `Omer image ${dayNumber}.jpg is missing. Text-only message was sent.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to distribute Omer message: ${(error as Error).message}`,
      );
      this.checkConnectionState((error as Error).message);
    }
  }

  private async initializeClient(): Promise<void> {
    if (this.isInitializing) return;

    this.isInitializing = true;
    this.isConnected = false;
    this.authCleanup.cleanupLockFiles();
    this.logger.log('Initializing WhatsApp client...');

    this.client = this.clientFactory.create();
    this.setupEventListeners();

    try {
      await this.client.initialize();
    } catch (error) {
      this.logger.error(
        `Failed to initialize WhatsApp client: ${(error as Error).message}`,
      );
      this.isInitializing = false;
      void this.handleRestart();
    }
  }

  private setupEventListeners(): void {
    this.client.on('qr', (qr: string) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      this.logger.log('New WhatsApp QR is ready for scanning');
      console.log(qrLink);
      this.isInitializing = false;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('WhatsApp client is ready');
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn(`WhatsApp client disconnected: ${reason}`);
      void this.handleRestart();
    });

    this.client.on('auth_failure', (message) => {
      this.logger.error(`WhatsApp auth failure: ${message}`);
      void this.handleRestart();
    });
  }

  private checkConnectionState(errorMessage: string): void {
    const criticalErrors = [
      'detached',
      'closed',
      'Session closed',
      'Target closed',
    ];

    if (criticalErrors.some((error) => errorMessage.includes(error))) {
      void this.handleRestart();
    }
  }

  private async handleRestart(): Promise<void> {
    if (this.isInitializing) return;

    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('Restarting WhatsApp client in 20 seconds...');

    try {
      if (this.client) {
        await this.client.destroy();
      }
    } catch (error) {
      this.logger.error(
        `Failed to destroy WhatsApp client: ${(error as Error).message}`,
      );
    }

    setTimeout(() => {
      void this.initializeClient();
    }, 20000);
  }
}
