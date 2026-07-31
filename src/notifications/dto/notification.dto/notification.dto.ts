import { IsEmail, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import {PartialType} from '@nestjs/mapped-types'


export class CreateNotificationDto {
    @IsString()
    title!: string
    
    @IsString()
    content!: string
    
    @IsString()
    channel!: string

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class UpdateNotificationDto extends PartialType(CreateNotificationDto){}