import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { ChannelPayloadDto } from './create-notification.dto';

/**
 * Todos opcionales; `channel` no existe aquí, así que se rechaza (whitelist).
 * Un `null` explícito es 400 (el contrato no admite null), por eso
 * ValidateIf(!== undefined) y no IsOptional (que también saltea null).
 */
export class ReviseNotificationDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({ type: ChannelPayloadDto })
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPayloadDto)
  payload?: ChannelPayloadDto;
}
