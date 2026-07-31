import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

@Controller('notifications')
export class NotificationsController {

    @Get()
    findAll(){
        return `All returned`
    }

    @Post()
    addOne(){
        return `+ 1 Notification`
    }

    @Get(':id')
    getOne(@Param() params){
        return `${params.id}`
    }

    @Put(':id')
    updateOne(@Param() params){
        return `${params.id}`
    }

    @Delete(':id')
    deleteOne(@Param() params){
        return `${params.id}`
    }
}
