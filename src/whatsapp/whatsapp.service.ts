// src/whatsapp/whatsapp.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { join } from 'path';
import { existsSync, rmSync, readdirSync, lstatSync } from 'fs';
import { CONFIG } from 'src/config/bot.config';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client!: Client;
  private readonly logger = new Logger('WhatsappService');
  private isConnected = false;
  private isInitializing = false;

  async onModuleInit(): Promise<void> {
    await this.initializeClient();
  }

  /**
   * מאפשר לשירותים אחרים לבדוק אם החיבור לוואטסאפ פעיל
   */
  public isClientReady(): boolean {
    return this.isConnected;
  }

  /**
   * פונקציית עזר פרטית להשהיה אקראית (Anti-Ban Jitter)
   */
  private async sleepWithJitter(): Promise<void> {
    const { MIN, MAX } = CONFIG.DELAY;
    const randomDelay = Math.floor(Math.random() * (MAX - MIN + 1) + MIN);
    this.logger.debug(
      `🛡️ Anti-Ban: Waiting ${randomDelay}ms before sending...`,
    );
    return new Promise((resolve) => setTimeout(resolve, randomDelay));
  }

  private async initializeClient(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.isConnected = false;

    // ניקוי קבצי נעילה (Locks) לפני האתחול למניעת קריסות ב-Railway
    this.cleanupLockFiles();

    this.logger.log('🛠️ אתחול Whatsapp Client (Optimized for Production)...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'omer-bot-v3',
        dataPath: CONFIG.PATHS.AUTH_DIR,
      }),
      authTimeoutMs: 0,
      qrMaxRetries: 30,
      takeoverOnConflict: true,
      puppeteer: {
        headless: true,
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

    try {
      await this.client.initialize();
    } catch (err) {
      const error = err as Error;
      this.logger.error(`❌ שגיאה באתחול ה-Client: ${error.message}`);
      this.isInitializing = false;
      this.handleRestart();
    }
  }

  private setupEventListeners(): void {
    this.client.on('qr', (qr: string) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      this.logger.log('📢 QR חדש לסריקה!');
      console.log(qrLink);
      this.isInitializing = false;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅✅✅ READY! הבוט מחובר ופעיל.');
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn(`🔌 הבוט נותק: ${reason}`);
      this.handleRestart();
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error(`❌ כשל באימות (Auth Failure): ${msg}`);
      this.handleRestart();
    });
  }

  /**
   * ניקוי רקורסיבי של קבצי SingletonLock שמונעים מהקליינט לעלות ב-Volumes של Railway
   */
  private cleanupLockFiles(): void {
    try {
      const authPath = CONFIG.PATHS.AUTH_DIR;
      if (!existsSync(authPath)) return;

      this.logger.warn('🧹 סורק ומנקה קבצי Lock מה-Volume...');

      const cleanLocks = (dir: string) => {
        const items = readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          if (lstatSync(fullPath).isDirectory()) {
            cleanLocks(fullPath);
          } else if (item === 'SingletonLock') {
            rmSync(fullPath, { force: true });
            this.logger.log(`🗑️ הוסר בהצלחה: ${fullPath}`);
          }
        }
      };

      cleanLocks(authPath);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`⚠️ תקלה במהלך ניקוי קבצי Lock: ${error.message}`);
    }
  }

  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Tried to send message but not connected to: ${to}`);
      return;
    }
    try {
      await this.client.sendMessage(to, body);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`❌ שגיאה בשליחת הודעה: ${error.message}`);
      this.checkConnectionState(error.message);
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

      // אבטחה: השהייה אקראית לפני כל פעולת שליחה למניעת חסימות
      await this.sleepWithJitter();

      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);

        await this.client.sendMessage(groupId, media, { caption });

        await this.sendMessage(
          CONFIG.OWNER_NUMBER,
          `✅ הודעת יום ${dayNumber} הופצה בהצלחה ל- ${groupId}`,
        );
      } else {
        await this.client.sendMessage(groupId, caption);

        await this.sendMessage(
          CONFIG.OWNER_NUMBER,
          `⚠️ נשלח טקסט בלבד (תמונה ${dayNumber}.jpg חסרה).`,
        );
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(`❌ שגיאה בהפצת העומר: ${error.message}`);
      this.checkConnectionState(error.message);
    }
  }

  private checkConnectionState(errorMessage: string): void {
    const criticalErrors = [
      'detached',
      'closed',
      'Session closed',
      'Target closed',
    ];
    if (criticalErrors.some((e) => errorMessage.includes(e))) {
      this.handleRestart();
    }
  }

  private async handleRestart(): Promise<void> {
    if (this.isInitializing) return;
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('🔄 מאתחל את הקליינט מחדש בעוד 20 שניות...');

    try {
      if (this.client) {
        await this.client.destroy();
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(`שגיאה בסגירת הקליינט: ${error.message}`);
    }

    setTimeout(() => this.initializeClient(), 20000);
  }
}
