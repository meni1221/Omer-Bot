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

  private async initializeClient(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.isConnected = false;

    // --- ניקוי אגרסיבי של קבצי SingletonLock ב-Volume ---
    try {
      const authPath = join(process.cwd(), '.wwebjs_auth');
      if (existsSync(authPath)) {
        this.logger.warn('🧹 סורק ומנקה קבצי Lock מה-Volume...');

        const cleanLocks = (dir: string) => {
          const items = readdirSync(dir);
          for (const item of items) {
            const fullPath = join(dir, item);
            if (lstatSync(fullPath).isDirectory()) {
              cleanLocks(fullPath); // סריקה רקורסיבית
            } else if (item === 'SingletonLock') {
              rmSync(fullPath, { force: true });
              this.logger.log(`🗑️ הוסר בהצלחה: ${fullPath}`);
            }
          }
        };

        cleanLocks(authPath);
      }
    } catch (err: any) {
      this.logger.error(`⚠️ תקלה במהלך ניקוי קבצי Lock: ${err.message}`);
    }
    // ----------------------------------------------------

    this.logger.log('🛠️ אתחול Whatsapp Client (Optimized for Production)...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'omer-bot-v3',
        dataPath: './.wwebjs_auth',
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

    this.client.on('qr', (qr: string) => {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      this.logger.log('📢 QR חדש לסריקה!');
      console.log(qrLink);
      this.isInitializing = false;
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.isInitializing = false;
      this.logger.log('✅✅✅ READY! הבוט מחובר ופעיל.');
    });

    try {
      await this.client.initialize();
    } catch (err: any) {
      this.logger.error(`❌ שגיאה באתחול ה-Client: ${err.message}`);
      this.isInitializing = false;
      this.handleRestart();
    }
  }

  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.sendMessage(to, body);
    } catch (e: any) {
      this.logger.error(`❌ שגיאה בשליחת הודעה: ${e.message}`);
      if (e.message.includes('detached') || e.message.includes('closed')) {
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
        // השהייה קלה למניעת זיהוי כבוט ספאמר
        await new Promise((resolve) => setTimeout(resolve, 3500));
        await this.client.sendMessage(groupId, media, { caption });

        await this.sendMessage(
          CONFIG.OWNER_NUMBER,
          `✅ הודעת יום ${dayNumber} הופצה בהצלחה.`,
        );
      } else {
        await this.client.sendMessage(groupId, caption);
        await this.sendMessage(
          CONFIG.OWNER_NUMBER,
          `⚠️ נשלח טקסט בלבד (תמונה ${dayNumber}.jpg חסרה).`,
        );
      }
    } catch (e: any) {
      this.logger.error(`❌ שגיאה בהפצת העומר: ${e.message}`);
      if (e.message.includes('detached') || e.message.includes('closed')) {
        this.handleRestart();
      }
    }
  }

  private async handleRestart(): Promise<void> {
    if (this.isInitializing) return;
    this.isConnected = false;
    this.isInitializing = false;
    this.logger.warn('🔄 מאתחל את הקליינט מחדש בעוד 20 שניות...');

    try {
      await this.client.destroy();
    } catch (e: any) {
      this.logger.error(`שגיאה בסגירת הקליינט: ${e.message}`);
    }

    setTimeout(() => this.initializeClient(), 20000);
  }
}