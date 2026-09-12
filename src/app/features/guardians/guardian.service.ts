import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateGuardianRequest,
  CreateStudentGuardianRequest,
  Guardian,
  GuardianDeletionImpact,
  StudentGuardian,
  UpdateGuardianRequest
} from './guardian.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianService {

  private readonly http = inject(HttpClient);

  findAllBySchool(
    schoolId: number
  ): Observable<Guardian[]> {
    return this.http.get<Guardian[]>(
      '/api/v1/guardians',
      {
        params: {
          schoolId
        }
      }
    );
  }

  findById(
    guardianId: number
  ): Observable<Guardian> {
    return this.http.get<Guardian>(
      `/api/v1/guardians/${guardianId}`
    );
  }

  create(
    request: CreateGuardianRequest
  ): Observable<Guardian> {
    return this.http.post<Guardian>(
      '/api/v1/guardians',
      request
    );
  }

  update(
    guardianId: number,
    request: UpdateGuardianRequest
  ): Observable<Guardian> {
    return this.http.put<Guardian>(
      `/api/v1/guardians/${guardianId}`,
      request
    );
  }

  deletionImpact(
    guardianId: number
  ): Observable<GuardianDeletionImpact> {
    return this.http.get<GuardianDeletionImpact>(
      `/api/v1/guardians/${guardianId}/deletion-impact`
    );
  }

  delete(
    guardianId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/guardians/${guardianId}`
    );
  }

  findAllByStudent(
    studentId: number
  ): Observable<StudentGuardian[]> {
    return this.http.get<StudentGuardian[]>(
      `/api/v1/students/${studentId}/guardians`
    );
  }

  linkToStudent(
    request: CreateStudentGuardianRequest
  ): Observable<StudentGuardian> {
    return this.http.post<StudentGuardian>(
      '/api/v1/student-guardians',
      request
    );
  }

  unlinkFromStudent(
    studentId: number,
    guardianId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/students/${studentId}/guardians/${guardianId}`
    );
  }
}
