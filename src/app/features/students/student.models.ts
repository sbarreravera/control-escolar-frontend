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

export type StudentSort =
  | 'enrollmentNumber'
  | 'studentName'
  | 'academicCycleName'
  | 'schoolGroup'
  | 'active';

export type SortDirection = 'asc' | 'desc';

export interface StudentPageQuery {
  schoolId: number;
  page: number;
  size: number;
  search?: string;
  academicCycleId?: number;
  schoolGroupId?: number;
  active?: boolean;
  sort: StudentSort;
  direction: SortDirection;
}

export interface StudentPage {
  content: Student[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
