export enum UserJobType {
  SEND_WELCOME_EMAIL = 'user.send_welcome_email',
  RESET_PASSWORD = 'user.reset_password',
}

export interface ISendWelcomeEmailPayload {
  userId: string;
  email: string;
  firstName: string;
}

export interface IResetPasswordPayload {
  email: string;
  token: string;
}
