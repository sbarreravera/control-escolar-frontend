import { AppUserRole } from '../../core/auth/auth.models';

export interface SchoolModuleDefinition {
  key: string;
  name: string;
  description: string;
  defaultGranted: boolean;
  order: number;
}

export interface SchoolUser {
  id: number;
  schoolId: number;
  fullName: string;
  email: string;
  role: AppUserRole;
  active: boolean;
  moduleKeys: string[];
  editable: boolean;
  archivable: boolean;
  restorable: boolean;
  archivedAt: string | null;
  archivedByUserId: number | null;
  archivedByUserName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolUserRequest {
  schoolId: number;
  fullName: string;
  email: string;
  password: string;
  moduleKeys: string[];
}

export interface UpdateSchoolUserRequest {
  fullName: string;
  email: string;
  active: boolean;
  password: string | null;
  moduleKeys: string[];
}

export interface RestoreSchoolUserRequest {
  password: string;
}
