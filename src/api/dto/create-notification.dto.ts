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

export class ChannelPayloadDto {
  @ApiProperty({ example: '+5219611234567' })
  @IsString()
  @IsNotEmpty()
  recipient!: string;
}

export class CreateNotificationDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  /** Solo string no vacío: el registro de canales decide si existe (ADR-004). */
  @ApiProperty({ example: 'sms', maxLength: 32 })
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
