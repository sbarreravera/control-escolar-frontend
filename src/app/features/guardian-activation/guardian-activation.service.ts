import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GuardianAccessRevocation,
  GuardianActivationPage,
  GuardianInvitationBatch
} from './guardian-activation.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianActivationService {

  private readonly http = inject(HttpClient);

  findPage(
    schoolId: number,
    page: number,
    size: number,
    search: string,
    state: string
  ): Observable<GuardianActivationPage> {
    return this.http.get<GuardianActivationPage>(
      '/api/v1/guardian-activations',
      {
        params: { schoolId, page, size, search, state }
      }
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
}
