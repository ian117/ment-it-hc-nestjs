import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { ApiSchemaOf } from '../swagger-schema';

@ApiSchemaOf('ChannelPayload', { additionalProperties: false })
export class ChannelPayloadDto {
  @ApiProperty({ example: '+5219611234567', minLength: 1 })
  @IsString()
  @IsNotEmpty()
  recipient!: string;
}

@ApiSchemaOf('CreateNotificationRequest', { additionalProperties: false })
export class CreateNotificationDto {
  @ApiProperty({ minLength: 1, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @IsNotEmpty()
  content!: string;

  /** Solo string no vacío: el registro de canales decide si existe (ADR-004). */
  @ApiProperty({
    example: 'sms',
    minLength: 1,
    maxLength: 32,
    description:
      'Canal de entrega (string abierto, lo resuelve el registro de canales). Valores conocidos: email, sms, push.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  channel!: string;

  @ApiProperty({ type: ChannelPayloadDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPayloadDto)
  payload!: ChannelPayloadDto;
}
