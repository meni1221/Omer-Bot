import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappAuthCleanupService } from './whatsapp-auth-cleanup.service';
import { WhatsappClientFactory } from './whatsapp-client.factory';
import { WhatsappDelayService } from './whatsapp-delay.service';

@Module({
  providers: [
    WhatsappService,
    WhatsappAuthCleanupService,
    WhatsappClientFactory,
    WhatsappDelayService,
  ],
  exports: [WhatsappService],
})
export class WhatsappModule {}
