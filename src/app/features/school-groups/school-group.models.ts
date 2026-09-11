export interface SchoolGroup {
  id: number;
  schoolId: number;
  academicCycleId: number;
  academicCycleName: string;
  gradeName: string;
  groupName: string;
  active: boolean;
  hasStudents: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolGroupRequest {
  academicCycleId: number;
  gradeName: string;
  groupName: string;
}

export interface UpdateSchoolGroupRequest {
  gradeName: string;
  groupName: string;
}
