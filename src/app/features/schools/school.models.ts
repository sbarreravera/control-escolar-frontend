export interface School {
  id: number;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolRequest {
  name: string;
  code: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}