import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/user.dto';
import { UserService } from './user/user.service';

@Controller('auth')
export class AuthController {
    
    constructor(
        private readonly userService: UserService,
    ){}

    @Post('signup')
    async signup(@Body() body: CreateUserDto) {
        const user = await this.userService.signUp(body.email, body.password);
        return { id: user.id, email: user.email };
    }

    @Post('login')
    async login(@Body() body: LoginDto) {
        const isValid = await this.userService.matchEmailPassword(body.email, body. password);
        if (!isValid) throw new UnauthorizedException('Invalid credentials');

        // TODO Generar JWT
        return { message: 'Login successful' };
    }

    @Get('me')
    me() {
     return `Profile data`;
    }

    @Post('reset-password')
    resetPassword() {
      return `Password reset`;
    }
}
