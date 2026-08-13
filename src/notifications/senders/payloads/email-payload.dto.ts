import { IsEmail, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EmailPayloadDto {
  /** Si no viene, el envio va al email de la cuenta. */
  @ApiPropertyOptional({ example: 'otro@destino.com' })
  @IsOptional()
  @IsEmail()
  to?: string;
}
