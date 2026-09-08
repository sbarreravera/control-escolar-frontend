export interface AcademicCycle {
  id: number;
  schoolId: number;
  schoolName: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicCycleRequest {
  schoolId: number;
  name: string;
  startDate: string;
  endDate: string;
}
