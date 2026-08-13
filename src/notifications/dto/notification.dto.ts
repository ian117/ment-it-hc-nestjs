import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannelEnum } from 'src/entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Bienvenida' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Gracias por registrarte' })
  @IsString()
  content!: string;

  @ApiProperty({
    enum: NotificationChannelEnum,
    example: NotificationChannelEnum.EMAIL,
  })
  @IsEnum(NotificationChannelEnum)
  channel!: NotificationChannelEnum;

  /**
   * Datos propios del canal. La forma concreta la define el sender de cada
   * canal (ver senders/payloads/), y se valida en el dispatcher antes de
   * persistir -- por eso aca solo se exige que sea un objeto.
   */
  @ApiProperty({
    required: false,
    description:
      'Payload del canal. EMAIL: { to?: string }. SMS: { phoneNumber: string } (requerido). PUSH: { deviceToken: string } (requerido).',
    example: { deviceToken: 'fcm-device-token-abc123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateNotificationDto extends PartialType(
  OmitType(CreateNotificationDto, ['channel'] as const),
) {}
