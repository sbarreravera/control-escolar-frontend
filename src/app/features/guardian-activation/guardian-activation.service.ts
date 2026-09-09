import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GuardianAccessRevocation,
  GuardianActivationPage,
  GuardianActivationQuery,
  GuardianActivationSelection,
  GuardianInvitationBatch,
  GuardianSessionAccess
} from './guardian-activation.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianActivationService {

  private readonly http = inject(HttpClient);

  findPage(query: GuardianActivationQuery): Observable<GuardianActivationPage> {
    return this.http.get<GuardianActivationPage>(
      '/api/v1/guardian-activations',
      {
        params: this.toParams(query)
      }
    );
  }

  findSelection(
    query: GuardianActivationQuery
  ): Observable<GuardianActivationSelection> {
    return this.http.get<GuardianActivationSelection>(
      '/api/v1/guardian-activations/selection',
      { params: this.toParams(query) }
    );
  }

  createInvitations(
    schoolId: number,
    guardianIds: readonly number[]
  ): Observable<GuardianInvitationBatch> {
    return this.http.post<GuardianInvitationBatch>(
      '/api/v1/guardian-activations/invitations',
      {
        schoolId,
        guardianIds
      }
    );
  }

  createPasswordResetInvitation(
    schoolId: number,
    guardianId: number
  ): Observable<GuardianInvitationBatch> {
    return this.http.post<GuardianInvitationBatch>(
      '/api/v1/guardian-activations/password-reset-invitations',
      {
        schoolId,
        guardianIds: [guardianId]
      }
    );
  }

  findActiveSessions(
    guardianId: number
  ): Observable<GuardianSessionAccess[]> {
    return this.http.get<GuardianSessionAccess[]>(
      `/api/v1/guardian-activations/${guardianId}/sessions`
    );
  }

  revokeSession(
    guardianId: number,
    sessionId: number
  ): Observable<GuardianAccessRevocation> {
    return this.http.post<GuardianAccessRevocation>(
      `/api/v1/guardian-activations/${guardianId}/sessions/${sessionId}/revoke`,
      null
    );
  }

  revokeAccess(
    schoolId: number,
    guardianIds: readonly number[]
  ): Observable<GuardianAccessRevocation> {
    return this.http.post<GuardianAccessRevocation>(
      '/api/v1/guardian-activations/revoke',
      {
        schoolId,
        guardianIds
      }
    );
  }

  private toParams(query: GuardianActivationQuery): HttpParams {
    let params = new HttpParams()
      .set('schoolId', query.schoolId)
      .set('academicCycleId', query.academicCycleId)
      .set('search', query.search ?? '')
      .set('state', query.state ?? 'NOT_ACTIVE')
      .set('gradeName', query.gradeName ?? '')
      .set('contact', query.contact ?? 'ALL');

    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.schoolGroupId !== undefined) {
      params = params.set('schoolGroupId', query.schoolGroupId);
    }
    return params;
  }
}
