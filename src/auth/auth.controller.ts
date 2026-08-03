import { Body, Controller, Get, NotFoundException, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfirmResetDto, CreateUserDto, LoginDto, RequestResetDto } from './dto/user.dto';
import { UserService } from './user/user.service';
import { JwtAuthGuard } from './user/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService
    ){}

    @Post('signup')
    async signup(@Body() body: CreateUserDto) {
        const user = await this.userService.signUp(body.email, body.password);
        return { id: user.id, email: user.email };
    }

    @Post('login')
    async login(@Body() body: LoginDto) {
        const user = await this.userService.validateUser(body.email, body. password);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload);
        return { accessToken };

    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
        me(@CurrentUser() user: { id: string; email: string }) {
        return user;
    }

    @Post('reset-password/request')
    async requestReset(@Body() body: RequestResetDto) {
        const token = await this.userService.generatePasswordResetToken(body.email);
        return { resetToken: token }; // solo para el take-home; normalmente se manda por email, no se regresa
    }

    @Post('reset-password/confirm')
    async confirmReset(@Body() body: ConfirmResetDto) {
        await this.userService.resetPassword(body.token, body.newPassword);
        return { message: 'Password updated' };
    }
}
