import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { User } from '../domain/user';
import { ApiSchemaOf } from './swagger-schema';

/** Forma JSON (camelCase) de `User` en el contrato. Nunca incluye el hash. */
@ApiSchemaOf('User')
export class UserResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

@ApiSchemaOf('AccessToken')
export class AccessTokenResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ enum: ['Bearer'], example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ type: 'integer', description: 'Segundos de vigencia' })
  expiresIn!: number;
}

@ApiSchemaOf('PasswordResetRequested')
export class PasswordResetRequestedResponse {
  @ApiProperty({ example: 'If the email exists, a reset link was sent' })
  message!: string;

  @ApiPropertyOptional({ description: 'Solo fuera de producción.' })
  resetToken?: string;
}

@ApiSchemaOf('Message')
export class MessageResponse {
  @ApiProperty()
  message!: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email.value,
    createdAt: user.createdAt.toISOString(),
  };
}
