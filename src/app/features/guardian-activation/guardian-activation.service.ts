import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GuardianAccessRevocation,
  GuardianActivationStatus,
  GuardianInvitationBatch
} from './guardian-activation.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianActivationService {

  private readonly http = inject(HttpClient);

  findAll(
    schoolId: number
  ): Observable<GuardianActivationStatus[]> {
    return this.http.get<GuardianActivationStatus[]>(
      '/api/v1/guardian-activations',
      {
        params: { schoolId }
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
