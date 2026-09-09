export type GuardianEnrollmentPurpose =
  | 'ACTIVATION'
  | 'PASSWORD_RESET';

export type GuardianInvitationState =
  | 'VALID'
  | 'USED'
  | 'REVOKED'
  | 'EXPIRED';

export interface GuardianDeviceEnrollmentInvitation {
  guardianId: number;
  guardianName: string;
  schoolName: string;
  schoolCode: string;
  username: string;
  purpose: GuardianEnrollmentPurpose;
  enrollmentToken: string;
  expiresAt: string;
}

export interface CompleteGuardianDeviceEnrollmentRequest {
  enrollmentToken: string;
  fcmToken: string | null;
  deviceName: string | null;
  password: string | null;
}

export interface GuardianDevice {
  id: number;
  guardianId: number;
  deviceName: string | null;
  active: boolean;
  registeredAt: string;
  lastUsedAt: string | null;
}

export interface CompleteGuardianDeviceEnrollmentResponse {
  guardianId: number;
  guardianName: string;
  schoolName: string;
  schoolCode: string;
  username: string;
  device: GuardianDevice | null;
  notificationsEnabled: boolean;
  sessionExpiresAt: string;
}

export interface GuardianIdentity {
  guardianId: number;
  schoolId: number;
  guardianName: string;
  schoolName: string;
  schoolCode: string;
  username: string;
  notificationsEnabled: boolean;
  sessionExpiresAt: string;
}

export interface GuardianInvitationStatus {
  status: GuardianInvitationState;
  purpose: GuardianEnrollmentPurpose;
  guardianId: number;
  guardianName: string;
  schoolName: string;
  schoolCode: string;
  username: string;
  accountActivated: boolean;
  expiresAt: string;
}

export interface GuardianLoginRequest {
  schoolCode: string;
  username: string;
  password: string;
  fcmToken: string | null;
  deviceName: string | null;
}

export interface GuardianLoginResponse
  extends CompleteGuardianDeviceEnrollmentResponse {
}

export interface RegisterCurrentGuardianDeviceRequest {
  fcmToken: string;
  deviceName: string | null;
}
