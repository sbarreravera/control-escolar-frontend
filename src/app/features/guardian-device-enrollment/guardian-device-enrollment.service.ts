import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import {
  Observable,
  switchMap
} from 'rxjs';

import {
  CsrfTokenResponse
} from '../../core/auth/auth.models';
import {
  CompleteGuardianDeviceEnrollmentRequest,
  CompleteGuardianDeviceEnrollmentResponse,
  GuardianDeviceEnrollmentInvitation,
  GuardianIdentity
} from './guardian-device-enrollment.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianDeviceEnrollmentService {

  private readonly http = inject(HttpClient);

  createInvitation(
    guardianId: number
  ): Observable<GuardianDeviceEnrollmentInvitation> {
    return this.http.post<GuardianDeviceEnrollmentInvitation>(
      `/api/v1/guardians/${guardianId}/device-enrollments`,
      null
    );
  }

  completeEnrollment(
    request: CompleteGuardianDeviceEnrollmentRequest
  ): Observable<CompleteGuardianDeviceEnrollmentResponse> {
    return this.requestCsrfToken().pipe(
      switchMap(() =>
        this.http.post<CompleteGuardianDeviceEnrollmentResponse>(
          '/api/v1/guardian-device-enrollments/complete',
          request
        )
      )
    );
  }

  loadGuardianIdentity(): Observable<GuardianIdentity> {
    return this.http.get<GuardianIdentity>(
      '/api/v1/guardian/me'
    );
  }

  logoutGuardian(): Observable<void> {
    return this.requestCsrfToken().pipe(
      switchMap(() => this.http.post<void>(
        '/api/v1/guardian/auth/logout',
        null
      ))
    );
  }

  private requestCsrfToken():
    Observable<CsrfTokenResponse> {
    return this.http.get<CsrfTokenResponse>(
      '/api/v1/auth/csrf'
    );
  }
}
