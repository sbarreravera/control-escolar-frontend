export type AppUserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'OPERATOR';

export interface AuthenticatedUser {
  id: number;
  schoolId: number | null;
  schoolName: string | null;
  fullName: string;
  email: string;
  role: AppUserRole;
  moduleKeys: string[];
}

export interface CsrfTokenResponse {
  headerName: string;
  parameterName: string;
  token: string;
}