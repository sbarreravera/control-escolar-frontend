export type AccessEventType =
  | 'ENTRY'
  | 'EXIT';

export type CaptureMethod =
  | 'QR_CAMERA'
  | 'QR_USB';

export interface ScanAccessEventRequest {
  qrToken: string;
  eventType: AccessEventType;
  captureMethod: CaptureMethod;
  deviceName: string | null;
  notes: string | null;
}

export interface AccessEvent {
  id: number;
  studentId: number;
  studentName: string;
  enrollmentNumber: string;
  credentialId: number;
  eventType: AccessEventType;
  captureMethod: CaptureMethod;
  occurredAt: string;
  deviceName: string | null;
  notes: string | null;
  notificationsQueued: number;
}