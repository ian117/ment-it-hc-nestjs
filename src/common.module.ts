import { Module } from '@nestjs/common';

import { CLOCK } from './application/ports/clock';
import { ID_GENERATOR } from './application/ports/id-generator';
import { SystemClock } from './infrastructure/clock/system-clock';
import { UuidIdGenerator } from './infrastructure/ids/uuid-id-generator';

/**
 * Puertos transversales (hora e ids) que comparten AuthModule y
 * NotificationsModule. Una sola instancia, un solo lugar que elige la clase.
 */
@Module({
  providers: [
    { provide: CLOCK, useFactory: () => new SystemClock() },
    { provide: ID_GENERATOR, useFactory: () => new UuidIdGenerator() },
  ],
  exports: [CLOCK, ID_GENERATOR],
})
export class CommonModule {}
