import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import {PartialType, OmitType} from '@nestjs/mapped-types'
import { NotificationChannelEnum } from 'src/entities/notification.entity';


export class CreateNotificationDto {
    @IsString()
    title!: string
    
    @IsString()
    content!: string
    
    @IsEnum(NotificationChannelEnum)
    channel!: NotificationChannelEnum

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class UpdateNotificationDto extends PartialType(OmitType(CreateNotificationDto, ['channel'] as const)) {}
