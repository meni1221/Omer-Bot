// src/omer/omer.module.ts
import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CommonModule } from '../common/common.module';
import { OmerService } from './omer.service';
import { OmerSchedulerService } from './omer-scheduler.service';

@Module({
  imports: [WhatsappModule, CommonModule],
  providers: [OmerService, OmerSchedulerService],
})
export class OmerModule {}
