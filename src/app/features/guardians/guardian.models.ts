export interface Guardian {
  id: number;
  schoolId: number;
  schoolName: string;
  externalReference: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuardianRequest {
  schoolId: number;
  externalReference: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
}

export interface UpdateGuardianRequest {
  fullName: string;
  phone: string | null;
  email: string | null;
}

export interface StudentGuardian {
  studentId: number;
  studentName: string;
  guardianId: number;
  guardianName: string;
  relationship: string | null;
  primaryContact: boolean;
  receivesNotifications: boolean;
  createdAt: string;
}

export interface CreateStudentGuardianRequest {
  studentId: number;
  guardianId: number;
  relationship: string | null;
  primaryContact: boolean;
  receivesNotifications: boolean;
}
