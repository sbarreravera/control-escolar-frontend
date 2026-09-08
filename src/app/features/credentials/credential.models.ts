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