import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {PartialType} from '@nestjs/mapped-types'

export class CreateUserDto {
    @ApiProperty({ example: 'google@gmail.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'securepassword123' })
    @IsString()
    @MinLength(8)
    password!: string;
}

export class LoginDto extends CreateUserDto {}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class RequestResetDto {
  @IsEmail()
  email!: string;
}

export class ConfirmResetDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}