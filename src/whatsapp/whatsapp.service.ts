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
  // המספר שלך בפורמט וואטסאפ
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
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', async () => {
      this.isConnected = true;
      this.logger.log('✅ WhatsApp Client is Ready!');
      
      try {
        await this.client.sendMessage(this.ownerNumber, '🚀 מני, הבוט רץ ב-Railway ומחובר בהצלחה!');
      } catch (e) {
        this.logger.error('Failed to send startup message to owner');
      }
    });

    this.client.on('authenticated', () => {
      this.logger.log('🔓 Authenticated successfully');
    });

    this.client.initialize().catch((err) => {
      this.logger.error('Client Initialization Error:', err);
    });
  }

  // פונקציה חדשה: שליחת הודעת טקסט כללית (לעדכונים והתראות)
  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Cannot send message to ${to}: Client not connected`);
      return;
    }
    try {
      await this.client.sendMessage(to, body);
      this.logger.log(`Message sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending message to ${to}: ${error.message}`);
    }
  }

  // פונקציה קיימת: שליחת הודעת עומר עם תמונה
  async sendOmerMessage(
    groupId: string,
    dayNumber: string,
    caption: string,
  ): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Cannot send: Client not connected');
      return;
    }

    try {
      const imagePath = join(process.cwd(), 'assets', 'omer', `${dayNumber}.jpg`);
      
      if (existsSync(imagePath)) {
        const media = MessageMedia.fromFilePath(imagePath);
        await this.client.sendMessage(groupId, media, { caption });
        
        // שליחת עדכון אליך
        await this.sendMessage(this.ownerNumber, `✅ הודעת עומר (יום ${dayNumber}) נשלחה בהצלחה לקבוצה!`);
        
        this.logger.log(`Success: Day ${dayNumber} sent to group.`);
      } else {
        await this.client.sendMessage(groupId, caption);
        await this.sendMessage(this.ownerNumber, `⚠️ הודעת טקסט נשלחה (תמונה ליום ${dayNumber} חסרה)`);
      }
    } catch (error) {
      this.logger.error(`Error in sendOmerMessage: ${error.message}`);
      await this.sendMessage(this.ownerNumber, `❌ שגיאה בשליחת הודעת עומר: ${error.message}`);
    }
  }
}