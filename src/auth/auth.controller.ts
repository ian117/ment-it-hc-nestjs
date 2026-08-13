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
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
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
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Registra un Usuario en la aplicacion' })
  @ApiResponse({ status: 201 })
  async signup(@Body() body: CreateUserDto) {
    const user = await this.userService.signUp(body.email, body.password);
    return { id: user.id, email: user.email };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // freno a la fuerza bruta
  @ApiOperation({ summary: 'Obtiene el token JWT' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 429, description: 'Demasiados intentos' })
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Solicita un token de reseteo de password' })
  @ApiResponse({
    status: 201,
    description:
      'Respuesta identica exista o no el email. Fuera de produccion incluye resetToken.',
  })
  async requestReset(@Body() body: RequestResetDto) {
    const token = await this.userService.generatePasswordResetToken(body.email);

    // La respuesta es la misma exista o no el email. Antes esto tiraba 404
    // cuando no existia, lo que convertia al endpoint en un oraculo de
    // "que direcciones estan registradas en el sistema".
    const response: { message: string; resetToken?: string } = {
      message: 'Si el email existe, se envio un link de reseteo',
    };

    // El token solo se devuelve fuera de produccion, para poder probar el flujo
    // sin servidor de mail. En un sistema real viaja por email y nunca por la
    // respuesta HTTP.
    if (token && this.configService.get<string>('nodeEnv') !== 'production') {
      response.resetToken = token;
    }

    return response;
  }

  @Post('reset-password/confirm')
  async confirmReset(@Body() body: ConfirmResetDto) {
    await this.userService.resetPassword(body.token, body.newPassword);
    return { message: 'Password updated' };
  }
}
