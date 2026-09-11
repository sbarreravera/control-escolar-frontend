import {
  HttpClient,
  HttpResponse
} from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  GuardianImportResult,
  GuardianImportValidation
} from './guardian-import.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianImportService {

  private readonly http = inject(HttpClient);

  downloadTemplate(
    schoolId: number
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      '/api/v1/guardian-imports/template',
      {
        params: {
          schoolId
        },
        observe: 'response',
        responseType: 'blob'
      }
    );
  }

  validate(
    schoolId: number,
    file: File
  ): Observable<GuardianImportValidation> {
    return this.http.post<GuardianImportValidation>(
      '/api/v1/guardian-imports/validate',
      this.fileBody(file),
      {
        params: {
          schoolId
        }
      }
    );
  }

  importGuardians(
    schoolId: number,
    file: File
  ): Observable<GuardianImportResult> {
    return this.http.post<GuardianImportResult>(
      '/api/v1/guardian-imports',
      this.fileBody(file),
      {
        params: {
          schoolId
        }
      }
    );
  }

  private fileBody(file: File): FormData {
    const body = new FormData();
    body.append('file', file, file.name);
    return body;
  }
}
