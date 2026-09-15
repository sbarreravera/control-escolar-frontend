export interface Credential {
  id: number;
  studentId: number;
  qrToken: string;
  active: boolean;
  issuedAt: string;
  expiresAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
}

export interface BulkCredential {
  credentialId: number;
  studentId: number;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  qrToken: string;
  created: boolean;
}
