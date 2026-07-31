import { Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
    
    @Post('register')
    register(){
        return `Registered within the App`
    }

    @Post('login')
    login(){
        return `Loggued into ur account`
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
