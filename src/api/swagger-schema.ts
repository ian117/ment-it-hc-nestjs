import { ApiSchema } from '@nestjs/swagger';

/**
 * `@ApiSchema` solo tipa `name` y `description`, pero el resto de las claves
 * se vuelcan tal cual al schema (additionalProperties, minProperties...).
 */
export function ApiSchemaOf(
  name: string,
  extra: Record<string, unknown> = {},
): ClassDecorator {
  return ApiSchema({ name, ...extra });
}
