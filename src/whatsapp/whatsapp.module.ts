import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { OmerService } from 'src/omer/omer.service';

@Module({
  providers: [WhatsappService, OmerService],
  exports: [WhatsappService],
})
export class WhatsappModule {}