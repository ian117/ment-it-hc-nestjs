import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import {PartialType, OmitType} from '@nestjs/mapped-types'
import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannelEnum } from 'src/entities/notification.entity';


export class CreateNotificationDto {
    @ApiProperty({ example: 'Bienvenida' })
    @IsString()
    title!: string
    
    @ApiProperty({ example: 'Gracias por registrarte' })
    @IsString()
    content!: string
    
    @ApiProperty({ enum: NotificationChannelEnum, example: NotificationChannelEnum.EMAIL })
    @IsEnum(NotificationChannelEnum)
    channel!: NotificationChannelEnum

    @ApiProperty({ required: false })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class UpdateNotificationDto extends PartialType(OmitType(CreateNotificationDto, ['channel'] as const)) {}
