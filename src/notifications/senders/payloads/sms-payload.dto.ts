import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SmsPayloadDto {
  @ApiProperty({ example: '+5491123456789' })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be a valid E.164 phone number',
  })
  phoneNumber!: string;
}
