import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { CsrfTokenResponse } from '../../core/auth/auth.models';
import {
  GuardianRegistrationContext,
  GuardianRegistrationSchool,
  GuardianRegistrationSettings,
  GuardianSelfRegistrationRequest,
  GuardianSelfRegistrationResponse,
  UpdateGuardianRegistrationSettingsRequest
} from './guardian-registration.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianRegistrationService {

  private readonly http = inject(HttpClient);

  listSchools(): Observable<GuardianRegistrationSchool[]> {
    return this.http.get<GuardianRegistrationSchool[]>(
      '/api/v1/guardian-registration/schools'
    );
  }

  loadContext(token: string): Observable<GuardianRegistrationContext> {
    return this.http.get<GuardianRegistrationContext>(
      '/api/v1/guardian-registration/context',
      { params: new HttpParams().set('token', token) }
    );
  }

  register(
    request: GuardianSelfRegistrationRequest
  ): Observable<GuardianSelfRegistrationResponse> {
    return this.requestCsrfToken().pipe(
      switchMap(() => this.http.post<GuardianSelfRegistrationResponse>(
        '/api/v1/guardian-registration',
        request
      ))
    );
  }

  loadSettings(schoolId: number): Observable<GuardianRegistrationSettings> {
    return this.http.get<GuardianRegistrationSettings>(
      `/api/v1/guardian-registration-settings/${schoolId}`
    );
  }

  updateSettings(
    schoolId: number,
    request: UpdateGuardianRegistrationSettingsRequest
  ): Observable<GuardianRegistrationSettings> {
    return this.http.put<GuardianRegistrationSettings>(
      `/api/v1/guardian-registration-settings/${schoolId}`,
      request
    );
  }

  rotateToken(schoolId: number): Observable<GuardianRegistrationSettings> {
    return this.http.post<GuardianRegistrationSettings>(
      `/api/v1/guardian-registration-settings/${schoolId}/rotate-token`,
      null
    );
  }

  private requestCsrfToken(): Observable<CsrfTokenResponse> {
    return this.http.get<CsrfTokenResponse>('/api/v1/auth/csrf');
  }
}
