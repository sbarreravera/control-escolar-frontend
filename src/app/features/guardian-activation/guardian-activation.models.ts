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
}

export interface GuardianActivationPage {
  content: GuardianActivationStatus[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
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
