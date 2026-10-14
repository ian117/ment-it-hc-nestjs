import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

import { ApiSchemaOf } from '../swagger-schema';

@ApiSchemaOf('PasswordResetConfirm', { additionalProperties: false })
export class ConfirmPasswordResetDto {
  @ApiProperty({ minLength: 1 })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
