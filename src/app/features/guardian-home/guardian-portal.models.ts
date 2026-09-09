export type GuardianAccessEventType = 'ENTRY' | 'EXIT';

export interface GuardianAccessEvent {
  id: number;
  studentId: number;
  studentName: string;
  enrollmentNumber: string;
  eventType: GuardianAccessEventType;
  occurredAt: string;
}

export interface GuardianStudent {
  studentId: number;
  enrollmentNumber: string;
  fullName: string;
  active: boolean;
  relationship: string | null;
  primaryContact: boolean;
  academicCycleId: number | null;
  academicCycleName: string | null;
  schoolGroupId: number | null;
  gradeName: string | null;
  groupName: string | null;
  latestEvent: GuardianAccessEvent | null;
}

export interface GuardianAccessEventPage {
  content: GuardianAccessEvent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface GuardianHistoryQuery {
  page?: number;
  size?: number;
  studentId?: number;
  eventType?: GuardianAccessEventType;
  occurredFrom?: string;
  occurredTo?: string;
}
