import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushPayloadDto {
  @ApiProperty({ example: 'fcm-device-token-abc123' })
  @IsString()
  @IsNotEmpty()
  deviceToken!: string;
}
