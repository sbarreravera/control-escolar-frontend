export interface GuardianRegistrationSchool {
  name: string;
  code: string;
}

export interface GuardianRegistrationContext {
  schoolName: string;
  schoolCode: string;
  minimumGuardiansPerStudent: number;
  maximumGuardiansPerStudent: number;
}

export interface GuardianRegistrationSettings {
  schoolId: number;
  schoolName: string;
  enabled: boolean;
  minimumGuardiansPerStudent: number;
  maximumGuardiansPerStudent: number;
  registrationToken: string;
}

export interface UpdateGuardianRegistrationSettingsRequest {
  enabled: boolean;
  minimumGuardiansPerStudent: number;
  maximumGuardiansPerStudent: number;
}

export interface GuardianSelfRegistrationRequest {
  registrationToken?: string;
  schoolCode?: string;
  fullName: string;
  phone?: string;
  email: string;
  relationship: string;
  studentEnrollmentNumbers: string[];
  password: string;
}

export interface GuardianSelfRegistrationResponse {
  guardianId: number;
  guardianReference: string;
  username: string;
  schoolName: string;
  schoolCode: string;
  studentEnrollmentNumbers: string[];
}
