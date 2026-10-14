import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

import { ApiSchemaOf } from '../swagger-schema';

@ApiSchemaOf('LoginRequest', { additionalProperties: false })
export class LoginDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
