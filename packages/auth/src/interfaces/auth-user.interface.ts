export interface AuthUser {
  id: string;
  role: string;
  [key: string]: string | number | boolean | null | undefined | object | string[];
}
