export type CommunicationType =
  | 'GENERAL_NOTICE'
  | 'EXPRESS_ALERT';

export type CommunicationCategory =
  | 'GENERAL'
  | 'SCHEDULE'
  | 'ACADEMIC'
  | 'EVENT'
  | 'WEATHER'
  | 'EMERGENCY'
  | 'REMINDER'
  | 'OTHER';

export type CommunicationPriority =
  | 'NORMAL'
  | 'IMPORTANT'
  | 'URGENT';

export type CommunicationStatus =
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'CANCELLED';

export type CommunicationAudienceType =
  | 'ALL_SCHOOL'
  | 'CYCLE'
  | 'GRADES'
  | 'GROUPS'
  | 'STUDENTS';

export type CommunicationRecipientPushStatus =
  | 'NOT_ENABLED'
  | 'PENDING'
  | 'SENT'
  | 'FAILED';

export interface CommunicationAudienceRequest {
  schoolId: number;
  audienceType: CommunicationAudienceType;
  academicCycleId: number | null;
  gradeNames: string[];
  schoolGroupIds: number[];
  studentIds: number[];
}

export interface CreateCommunicationRequest {
  type: CommunicationType;
  category: CommunicationCategory;
  priority: CommunicationPriority;
  title: string;
  message: string;
  requiresAcknowledgement: boolean;
  audience: CommunicationAudienceRequest;
  scheduledAt: string | null;
}

export interface UpdateScheduledCommunicationRequest {
  type: CommunicationType;
  category: CommunicationCategory;
  priority: CommunicationPriority;
  title: string;
  message: string;
  requiresAcknowledgement: boolean;
  scheduledAt: string;
}

export interface CommunicationAudiencePreview {
  students: number;
  guardians: number;
  guardiansWithPush: number;
  guardiansWithoutPush: number;
  audienceSummary: string;
}

export interface Communication {
  id: number;
  schoolId: number;
  createdByName: string;
  type: CommunicationType;
  category: CommunicationCategory;
  priority: CommunicationPriority;
  status: CommunicationStatus;
  audienceType: CommunicationAudienceType;
  audienceSummary: string;
  title: string;
  message: string;
  requiresAcknowledgement: boolean;
  studentCount: number;
  recipientCount: number;
  pushRecipientCount: number;
  sentCount: number;
  failedCount: number;
  viewedCount: number;
  acknowledgedCount: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface CommunicationRecipient {
  recipientId: number;
  guardianId: number;
  guardianName: string;
  phone: string | null;
  email: string | null;
  pushStatus: CommunicationRecipientPushStatus;
  pushSentAt: string | null;
  viewedAt: string | null;
  acknowledgedAt: string | null;
}
