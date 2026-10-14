import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import {
  CONFIRM_PASSWORD_RESET,
  GET_CURRENT_USER,
  LOGIN,
  REGISTER_USER,
  REQUEST_PASSWORD_RESET,
} from '../application/tokens';
import type { ConfirmPasswordReset } from '../application/use-cases/confirm-password-reset';
import type { GetCurrentUser } from '../application/use-cases/get-current-user';
import type { Login } from '../application/use-cases/login';
import type { RegisterUser } from '../application/use-cases/register-user';
import type { RequestPasswordReset } from '../application/use-cases/request-password-reset';
import {
  AccessTokenResponse,
  MessageResponse,
  PasswordResetRequestedResponse,
  toUserResponse,
  UserResponse,
} from './auth.response';
import type { AuthenticatedUser } from './auth/authenticated-user';
import { CurrentUser } from './auth/current-user.decorator';
import { EXPOSE_RESET_TOKEN } from './auth/expose-reset-token';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ApiProblemResponse } from './problem.response';

/** 5 intentos por minuto por IP (ADR-014). */
const FIVE_PER_MINUTE = { default: { limit: 5, ttl: 60_000 } };

const BAD_REQUEST = 'Request inválido';
const TOO_MANY = 'Límite de intentos superado';

/** Solo traduce HTTP <-> casos de uso. Los errores los mapea el filtro. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(REGISTER_USER) private readonly register: RegisterUser,
    @Inject(LOGIN) private readonly login: Login,
    @Inject(GET_CURRENT_USER) private readonly getCurrentUser: GetCurrentUser,
    @Inject(REQUEST_PASSWORD_RESET)
    private readonly requestReset: RequestPasswordReset,
    @Inject(CONFIRM_PASSWORD_RESET)
    private readonly confirmReset: ConfirmPasswordReset,
    @Inject(EXPOSE_RESET_TOKEN) private readonly exposeResetToken: boolean,
  ) {}

  @Post('register')
  @ApiOperation({ operationId: 'registerUser', summary: 'Registra un usuario' })
  @ApiCreatedResponse({ description: 'Usuario creado', type: UserResponse })
  @ApiProblemResponse(400, BAD_REQUEST)
  @ApiProblemResponse(409, 'Email ya registrado')
  async registerOne(@Body() dto: RegisterUserDto): Promise<UserResponse> {
    const user = await this.register.execute({
      email: dto.email,
      password: dto.password,
    });
    return toUserResponse(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(FIVE_PER_MINUTE)
  @ApiOperation({
    operationId: 'login',
    summary: 'Devuelve un token de acceso',
    description:
      'Máximo 5 intentos por minuto por cliente. Responde igual exista o no el email.',
  })
  @ApiOkResponse({
    description: 'Credenciales válidas',
    type: AccessTokenResponse,
  })
  @ApiProblemResponse(400, BAD_REQUEST)
  @ApiProblemResponse(401, 'Credenciales incorrectas')
  @ApiProblemResponse(429, TOO_MANY)
  async loginOne(@Body() dto: LoginDto): Promise<AccessTokenResponse> {
    const issued = await this.login.execute({
      email: dto.email,
      password: dto.password,
    });
    return {
      accessToken: issued.accessToken,
      tokenType: 'Bearer',
      expiresIn: issued.expiresIn,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'getCurrentUser',
    summary: 'Perfil del usuario autenticado',
  })
  @ApiOkResponse({ description: 'Usuario autenticado', type: UserResponse })
  @ApiProblemResponse(401, 'Token ausente o inválido')
  async me(@CurrentUser() current: AuthenticatedUser): Promise<UserResponse> {
    const user = await this.getCurrentUser.execute({ userId: current.id });
    return toUserResponse(user);
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle(FIVE_PER_MINUTE)
  @ApiOperation({
    operationId: 'requestPasswordReset',
    summary: 'Solicita un token de reseteo',
    description:
      'La respuesta es idéntica exista o no el email (anti-enumeración). Fuera de producción incluye `resetToken` para poder probar el flujo.',
  })
  @ApiResponse({
    status: 202,
    description: 'Solicitud aceptada',
    type: PasswordResetRequestedResponse,
  })
  @ApiProblemResponse(400, BAD_REQUEST)
  @ApiProblemResponse(429, TOO_MANY)
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<PasswordResetRequestedResponse> {
    const token = await this.requestReset.execute({ email: dto.email });
    // El token en claro nunca se escribe en el log (ADR-014).
    const message = 'If the email exists, a reset link was sent';
    return token !== null && this.exposeResetToken
      ? { message, resetToken: token }
      : { message };
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'confirmPasswordReset',
    summary: 'Cambia la contraseña con un token válido',
  })
  @ApiOkResponse({
    description: 'Contraseña actualizada',
    type: MessageResponse,
  })
  @ApiProblemResponse(
    400,
    'Request inválido, o token inexistente, vencido o ya usado',
  )
  async confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
  ): Promise<MessageResponse> {
    await this.confirmReset.execute({
      token: dto.token,
      newPassword: dto.newPassword,
    });
    return { message: 'Password updated' };
  }
}
