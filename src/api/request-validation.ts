import { ValidationError, ValidationPipe } from '@nestjs/common';

import { FieldViolation } from '../domain/errors';

/** Request inválido (body/query). El filtro lo traduce a `validation-error`. */
export class RequestValidationError extends Error {
  constructor(readonly errors: FieldViolation[]) {
    super('Validation failed');
    this.name = 'RequestValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Aplana los errores de class-validator a `field` en notación de puntos. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): FieldViolation[] {
  const out: FieldViolation[] = [];
  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;
    for (const message of Object.values(error.constraints ?? {})) {
      out.push({ field, message });
    }
    if (error.children?.length) {
      out.push(...flattenValidationErrors(error.children, field));
    }
  }
  return out;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new RequestValidationError(flattenValidationErrors(errors)),
  });
}
