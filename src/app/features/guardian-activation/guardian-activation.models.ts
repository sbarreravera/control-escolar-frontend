export type GuardianActivationState =
  | 'NOT_INVITED'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'ACCESS_REVOKED'
  | 'INACTIVE';

export interface GuardianActivationStatus {
  guardianId: number;
  externalReference: string | null;
  guardianName: string;
  phone: string | null;
  email: string | null;
  guardianActive: boolean;
  activationState: GuardianActivationState;
  invitationCreatedAt: string | null;
  invitationExpiresAt: string | null;
  activatedAt: string | null;
  activeDevices: number;
  activeSessions: number;
  students: GuardianActivationStudent[];
}

export interface GuardianActivationStudent {
  studentId: number;
  enrollmentNumber: string;
  fullName: string;
  schoolGroupId: number;
  gradeName: string;
  groupName: string;
}

export interface GuardianActivationSummary {
  totalGuardians: number;
  notInvited: number;
  pending: number;
  active: number;
  requiresActivation: number;
  missingContact: number;
}

export interface GuardianActivationPage {
  content: GuardianActivationStatus[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  summary: GuardianActivationSummary;
}

export interface GuardianActivationQuery {
  schoolId: number;
  academicCycleId: number;
  page?: number;
  size?: number;
  search?: string;
  state?: string;
  schoolGroupId?: number;
  gradeName?: string;
  contact?: string;
}

export interface GuardianActivationSelection {
  guardianIds: number[];
  totalSelected: number;
}

export interface GuardianInvitation {
  guardianId: number;
  externalReference: string | null;
  guardianName: string;
  phone: string | null;
  email: string | null;
  schoolName: string;
  enrollmentToken: string;
  expiresAt: string;
}

export interface GuardianInvitationBatch {
  batchId: string;
  expiresAt: string;
  invitationsCreated: number;
  invitations: GuardianInvitation[];
}

export interface GuardianAccessRevocation {
  guardiansProcessed: number;
  invitationsRevoked: number;
  sessionsRevoked: number;
  devicesDeactivated: number;
}

export interface GuardianInvitationWithUrl
  extends GuardianInvitation {
  activationUrl: string;
}
