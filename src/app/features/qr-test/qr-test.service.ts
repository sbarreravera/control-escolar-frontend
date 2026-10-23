import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type QrTestStatus =
  | 'VALID'
  | 'EXPIRED'
  | 'INACTIVE_CREDENTIAL'
  | 'INACTIVE_STUDENT';

export interface QrTestResponse {
  valid: boolean;
  status: QrTestStatus;
  studentId: number;
  studentName: string;
  enrollmentNumber: string;
  schoolName: string;
  gradeName: string | null;
  groupName: string | null;
  credentialExpiresAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class QrTestService {
  private readonly http = inject(HttpClient);

  /** Consulta sin registro de eventos de acceso ni notificaciones. */
  validate(qrToken: string, schoolId: number): Observable<QrTestResponse> {
    return this.http.post<QrTestResponse>(
      '/api/v1/qr-tests/validate',
      { qrToken, schoolId }
    );
  }
}
