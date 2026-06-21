import { Injectable } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { CONFIG } from '../config/bot.config';

@Injectable()
export class WhatsappClientFactory {
  create(): Client {
    return new Client({
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
  }
}
