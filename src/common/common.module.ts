import { Module } from '@nestjs/common';
import { StateService } from './state.service';
import { CalendarProvider } from './calendar.provider';
import { HebcalService } from './hebcal.service';

@Module({
  providers: [StateService, CalendarProvider, HebcalService],
  exports: [StateService, CalendarProvider, HebcalService],
})
export class CommonModule {}
