export interface GuardianDeviceEnrollmentInvitation {
  guardianId: number;
  guardianName: string;
  schoolName: string;
  enrollmentToken: string;
  expiresAt: string;
}

export interface CompleteGuardianDeviceEnrollmentRequest {
  enrollmentToken: string;
  fcmToken: string;
  deviceName: string | null;
}

export interface GuardianDevice {
  id: number;
  guardianId: number;
  deviceName: string | null;
  active: boolean;
  registeredAt: string;
  lastUsedAt: string | null;
}