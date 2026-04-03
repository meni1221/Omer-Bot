import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OmerModule } from './omer/omer.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    WhatsappModule,
    OmerModule,
  ],
})
export class AppModule {}