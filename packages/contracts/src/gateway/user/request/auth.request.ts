import type {
  SignUpCommand,
  LoginCommand,
  RefreshTokenCommand,
} from '../../../user/user.command.js';

export interface SignUpRequest extends SignUpCommand {}

export interface LoginRequest extends LoginCommand {}

export interface RefreshTokenRequest extends RefreshTokenCommand {}
