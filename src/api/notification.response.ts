import { ApiProperty } from '@nestjs/swagger';

import { Notification } from '../domain/notification';
import { ChannelPayloadDto } from './dto/create-notification.dto';
import { ApiSchemaOf } from './swagger-schema';

/** Forma JSON (camelCase) de `Notification` en el contrato. Sin userId. */
@ApiSchemaOf('Notification')
export class NotificationResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({
    example: 'sms',
    description: 'Canal de entrega. Valores conocidos: email, sms, push.',
  })
  channel!: string;

  @ApiProperty({ type: ChannelPayloadDto })
  payload!: ChannelPayloadDto;

  @ApiProperty({
    enum: ['pending', 'sent', 'failed'],
    enumName: 'NotificationStatus',
  })
  status!: string;

  @ApiProperty({ type: 'integer', minimum: 0 })
  attempts!: number;

  @ApiProperty({ type: String, nullable: true })
  errorMessage!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  sentAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

@ApiSchemaOf('NotificationPage')
export class NotificationPageResponse {
  @ApiProperty({ type: [NotificationResponse] })
  data!: NotificationResponse[];

  @ApiProperty({ type: 'integer', minimum: 0 })
  total!: number;

  @ApiProperty({ type: 'integer', minimum: 1 })
  page!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 100 })
  limit!: number;
}

export function toNotificationResponse(n: Notification): NotificationResponse {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    channel: n.channel,
    payload: { recipient: n.recipient },
    status: n.status,
    attempts: n.attempts,
    errorMessage: n.errorMessage,
    sentAt: n.sentAt ? n.sentAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
