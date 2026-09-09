import { HttpClient, HttpParams } from '@angular/common/http';
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
  GuardianDevice,
  GuardianIdentity,
  GuardianInvitationStatus,
  GuardianLoginRequest,
  GuardianLoginResponse,
  RegisterCurrentGuardianDeviceRequest
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

  loadInvitationStatus(
    enrollmentToken: string
  ): Observable<GuardianInvitationStatus> {
    return this.http.get<GuardianInvitationStatus>(
      '/api/v1/guardian-device-enrollments/status',
      {
        params: new HttpParams().set('token', enrollmentToken)
      }
    );
  }

  loginGuardian(
    request: GuardianLoginRequest
  ): Observable<GuardianLoginResponse> {
    return this.requestCsrfToken().pipe(
      switchMap(() => this.http.post<GuardianLoginResponse>(
        '/api/v1/guardian-auth/login',
        request
      ))
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

  registerCurrentDevice(
    request: RegisterCurrentGuardianDeviceRequest
  ): Observable<GuardianDevice> {
    return this.requestCsrfToken().pipe(
      switchMap(() => this.http.post<GuardianDevice>(
        '/api/v1/guardian/devices',
        request
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
