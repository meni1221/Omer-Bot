import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { OmerService } from './omer.service';
import { OmerSchedulerService } from './omer-scheduler.service';

@Module({
  imports: [WhatsappModule],
  providers: [OmerService, OmerSchedulerService],
})
export class OmerModule {}
