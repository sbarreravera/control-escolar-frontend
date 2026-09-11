export interface DashboardRecentAccessEvent {
  id: number;
  studentId: number;
  studentName: string;
  enrollmentNumber: string;
  gradeName: string | null;
  groupName: string | null;
  eventType: 'ENTRY' | 'EXIT';
  occurredAt: string;
}

export interface DashboardSummary {
  activeStudents: number;
  activeGuardians: number;
  studentsWithGuardian: number;
  activeCredentials: number;
  activatedGuardianAccounts: number;
  guardiansWithNotifications: number;
  entriesToday: number;
  exitsToday: number;
  recentEvents: DashboardRecentAccessEvent[];
}
