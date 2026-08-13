import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ConfirmResetDto,
  CreateUserDto,
  LoginDto,
  RequestResetDto,
} from './dto/user.dto';
import type { UserInterface } from './user/user.interface';
import { USER_SERVICE } from './user/user-service.token';
import type { AuthenticatedUser } from './user/authenticated-user.interface';
import { JwtAuthGuard } from './user/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: UserInterface,
    private readonly jwtService: JwtService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Registra un Usuario en la aplicacion' })
  @ApiResponse({ status: 201 })
  async signup(@Body() body: CreateUserDto) {
    const user = await this.userService.signUp(body.email, body.password);
    return { id: user.id, email: user.email };
  }

  @Post('login')
  @ApiOperation({ summary: 'Obtiene el token JWT' })
  @ApiResponse({ status: 200 })
  async login(@Body() body: LoginDto) {
    const user = await this.userService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
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
