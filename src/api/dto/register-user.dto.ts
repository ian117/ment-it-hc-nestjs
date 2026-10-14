import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

import { ApiSchemaOf } from '../swagger-schema';

/** La política de longitud de la contraseña vive solo aquí (ADR-013). */
@ApiSchemaOf('RegisterRequest', { additionalProperties: false })
export class RegisterUserDto {
  @ApiProperty({ format: 'email', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
