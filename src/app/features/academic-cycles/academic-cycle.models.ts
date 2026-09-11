export interface AcademicCycle {
  id: number;
  schoolId: number;
  schoolName: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  hasGroups: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicCycleRequest {
  schoolId: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateAcademicCycleRequest {
  name: string;
  startDate: string;
  endDate: string;
}
