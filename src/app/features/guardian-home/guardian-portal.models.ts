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

export type GuardianCommunicationType =
  | 'GENERAL_NOTICE'
  | 'EXPRESS_ALERT';

export type GuardianCommunicationCategory =
  | 'GENERAL'
  | 'SCHEDULE'
  | 'ACADEMIC'
  | 'EVENT'
  | 'WEATHER'
  | 'EMERGENCY'
  | 'REMINDER'
  | 'OTHER';

export type GuardianCommunicationPriority =
  | 'NORMAL'
  | 'IMPORTANT'
  | 'URGENT';

export interface GuardianCommunication {
  id: number;
  type: GuardianCommunicationType;
  category: GuardianCommunicationCategory;
  priority: GuardianCommunicationPriority;
  title: string;
  message: string;
  requiresAcknowledgement: boolean;
  publishedAt: string;
  viewedAt: string | null;
  acknowledgedAt: string | null;
}
