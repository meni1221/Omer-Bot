import { Module } from '@nestjs/common';
import { StateService } from './state.service';
import { CalendarProvider } from './calendar.provider';

@Module({
  providers: [StateService, CalendarProvider],
  exports: [StateService, CalendarProvider],
})
export class CommonModule {}