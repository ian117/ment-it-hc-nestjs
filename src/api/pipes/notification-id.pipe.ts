import { PipeTransform } from '@nestjs/common';

import { NotificationNotFound } from '../../domain/errors';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un id con formato inválido no puede existir: responde como "no encontrada" (ADR-012). */
export class NotificationIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      throw new NotificationNotFound();
    }
    return value.toLowerCase();
  }
}
