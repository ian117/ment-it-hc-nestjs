import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { ApiSchemaOf } from './swagger-schema';

@ApiSchemaOf('ProblemError')
export class ProblemFieldErrorResponse {
  @ApiProperty()
  field!: string;

  @ApiProperty()
  message!: string;
}

/** Solo documenta el schema `Problem` (RFC 9457); el filtro arma el body real. */
@ApiSchemaOf('Problem', { description: 'RFC 9457 Problem Details' })
export class ProblemResponse {
  @ApiProperty({
    format: 'uri-reference',
    example: 'https://errors.local/not-found',
  })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: 'integer' })
  status!: number;

  @ApiPropertyOptional()
  detail?: string;

  @ApiPropertyOptional()
  instance?: string;

  @ApiPropertyOptional({ type: [ProblemFieldErrorResponse] })
  errors?: ProblemFieldErrorResponse[];
}

/** Respuesta de error `application/problem+json` con el schema `Problem`. */
export function ApiProblemResponse(status: number, description: string) {
  return applyDecorators(
    ApiExtraModels(ProblemResponse),
    ApiResponse({
      status,
      description,
      content: {
        'application/problem+json': {
          schema: { $ref: getSchemaPath(ProblemResponse) },
        },
      },
    }),
  );
}

export const ApiBadRequestProblem = () =>
  ApiProblemResponse(400, 'Request inválido o regla del canal violada');
export const ApiUnauthorizedProblem = () =>
  ApiProblemResponse(401, 'Token ausente o inválido');
export const ApiNotFoundProblem = () =>
  ApiProblemResponse(404, 'No existe o no pertenece al usuario autenticado');
export const ApiConflictProblem = () =>
  ApiProblemResponse(409, 'La notificación no está en estado failed');
