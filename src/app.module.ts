import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OmerModule } from './omer/omer.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [ScheduleModule.forRoot(), CommonModule, WhatsappModule, OmerModule],
})
export class AppModule {}
