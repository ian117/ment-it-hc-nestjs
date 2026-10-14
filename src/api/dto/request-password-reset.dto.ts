import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

import { ApiSchemaOf } from '../swagger-schema';

@ApiSchemaOf('PasswordResetRequest', { additionalProperties: false })
export class RequestPasswordResetDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;
}
