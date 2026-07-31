import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/user.dto';

@Controller('auth')
export class AuthController {
    
    @Post('signup')
    signup(@Body() body: CreateUserDto){
        // Se envian al servicio
        return body.email
    }

    @Post('login')
    login(@Body() body: LoginDto){
        // Se envian al servicio
        return body.email
    }

    @Get('me')
    me(){
        return `Profile data`
    }

    @Post('reset-password')
    resetPassword(){
        return `Password reset`
    }
}
