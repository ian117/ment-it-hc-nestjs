import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {

    @Get()
    // TODO make pagination DTO 
    findAll(){
        return `All returned`
    }

    @Post()
    addOne(@Body() body: CreateNotificationDto){
        return body
    }

    @Get(':id')
    // TODO make Param DTO
    getOne(@Param() params){
        return `${params.id}`
    }

    @Put(':id')
    updateOne(@Param() params, @Body() body: UpdateNotificationDto){
        return `${params.id}`
    }

    @Delete(':id')
    deleteOne(@Param() params){
        return `${params.id}`
    }
}
