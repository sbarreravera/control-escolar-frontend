import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  Credential
} from './credential.models';

@Injectable({
  providedIn: 'root'
})
export class CredentialService {

  private readonly http = inject(HttpClient);

  findActive(
    studentId: number
  ): Observable<Credential> {
    return this.http.get<Credential>(
      `/api/v1/students/${studentId}/credentials/active`
    );
  }

  create(
    studentId: number
  ): Observable<Credential> {
    return this.http.post<Credential>(
      `/api/v1/students/${studentId}/credentials`,
      null
    );
  }

  regenerate(
    studentId: number
  ): Observable<Credential> {
    return this.http.post<Credential>(
      `/api/v1/students/${studentId}/credentials/regenerate`,
      null
    );
  }

  deactivate(
    credentialId: number
  ): Observable<void> {
    return this.http.patch<void>(
      `/api/v1/credentials/${credentialId}/deactivate`,
      null
    );
  }
}