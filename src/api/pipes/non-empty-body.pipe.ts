import { PipeTransform } from '@nestjs/common';

import { RequestValidationError } from '../request-validation';

/** PATCH vacío (`{}`) → 400. Corre después del ValidationPipe global. */
export class NonEmptyBodyPipe<T extends object> implements PipeTransform<T, T> {
  transform(value: T): T {
    const hasChanges = Object.values(value ?? {}).some((v) => v !== undefined);
    if (!hasChanges) {
      throw new RequestValidationError([
        {
          field: 'body',
          message: 'at least one of title, content or payload must be provided',
        },
      ]);
    }
    return value;
  }
}
