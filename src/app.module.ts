import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OmerModule } from './omer/omer.module';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ScheduleModule.forRoot(), CommonModule, WhatsappModule, OmerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
