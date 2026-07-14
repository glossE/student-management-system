export type Role = 'PRINCIPAL' | 'ADMIN';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}
