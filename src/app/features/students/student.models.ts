export interface Student {
  id: number;
  schoolId: number;
  schoolName: string;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  gradeName: string | null;
  groupName: string | null;
  schoolGroupId: number | null;
  academicCycleId: number | null;
  academicCycleName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  schoolId: number;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  gradeName: string | null;
  groupName: string | null;
  schoolGroupId: number | null;
}

export interface UpdateStudentRequest {
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  schoolGroupId: number;
}
