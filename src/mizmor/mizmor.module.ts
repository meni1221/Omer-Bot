import { Module } from '@nestjs/common';
import { MizmorService } from './mizmor.service';
import { MizmorScheduler } from './mizmor.scheduler';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CommonModule } from '../common/common.module';
import { MizmorCalendarService } from './mizmor-calendar.service';
import { MizmorStateService } from './mizmor-state.service';

@Module({
  imports: [WhatsappModule, CommonModule],
  providers: [
    MizmorService,
    MizmorScheduler,
    MizmorCalendarService,
    MizmorStateService,
  ],
  exports: [MizmorService],
})
export class MizmorModule {}
