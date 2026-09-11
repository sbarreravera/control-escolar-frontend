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
  StudentImportResult,
  StudentImportValidation
} from './student-import.models';

@Injectable({
  providedIn: 'root'
})
export class StudentImportService {

  private readonly http = inject(HttpClient);

  downloadTemplate(
    academicCycleId: number
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      '/api/v1/student-imports/template',
      {
        params: {
          academicCycleId
        },
        observe: 'response',
        responseType: 'blob'
      }
    );
  }

  validate(
    academicCycleId: number,
    file: File
  ): Observable<StudentImportValidation> {
    return this.http.post<StudentImportValidation>(
      '/api/v1/student-imports/validate',
      this.fileBody(file),
      {
        params: {
          academicCycleId
        }
      }
    );
  }

  importStudents(
    academicCycleId: number,
    file: File
  ): Observable<StudentImportResult> {
    return this.http.post<StudentImportResult>(
      '/api/v1/student-imports',
      this.fileBody(file),
      {
        params: {
          academicCycleId
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
