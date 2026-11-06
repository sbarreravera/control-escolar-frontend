import { AccessEventType } from './access-event.models';

export type AccessTypeFilter = 'all' | AccessEventType;

export interface AccessMonitorRow {
  id: number;
  studentId: number;
  studentName: string;
  enrollmentNumber: string;
  academicCycleName: string | null;
  gradeName: string | null;
  groupName: string | null;
  eventType: AccessEventType;
  captureMethod: 'QR_CAMERA' | 'QR_USB' | 'MANUAL';
  occurredAt: string;
  deviceName: string | null;
}

export interface AccessMonitorPage {
  date: string;
  content: AccessMonitorRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AccessMonitorQuery {
  schoolId: number;
  date: string;
  page: number;
  size: number;
  search?: string;
  academicCycleId?: number;
  schoolGroupId?: number;
  eventType?: AccessEventType;
}

export interface AccessMonitorFilterOptions {
  cycles: Array<{ id: number; name: string; active: boolean }>;
  groups: Array<{
    id: number;
    academicCycleId: number;
    gradeName: string;
    groupName: string;
    active: boolean;
  }>;
}
