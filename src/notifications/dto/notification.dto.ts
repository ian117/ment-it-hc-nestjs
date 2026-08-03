import { IsEmail, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import {PartialType} from '@nestjs/mapped-types'
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

export class UpdateNotificationDto extends PartialType(CreateNotificationDto){}