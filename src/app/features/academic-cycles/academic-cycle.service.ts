import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  AcademicCycle,
  CreateAcademicCycleRequest,
  UpdateAcademicCycleRequest
} from './academic-cycle.models';

@Injectable({
  providedIn: 'root'
})
export class AcademicCycleService {

  private readonly http = inject(HttpClient);

  findAllBySchool(
    schoolId: number
  ): Observable<AcademicCycle[]> {
    return this.http.get<AcademicCycle[]>(
      '/api/v1/academic-cycles',
      {
        params: {
          schoolId
        }
      }
    );
  }

  create(
    request: CreateAcademicCycleRequest
  ): Observable<AcademicCycle> {
    return this.http.post<AcademicCycle>(
      '/api/v1/academic-cycles',
      request
    );
  }

  update(
    academicCycleId: number,
    request: UpdateAcademicCycleRequest
  ): Observable<AcademicCycle> {
    return this.http.put<AcademicCycle>(
      `/api/v1/academic-cycles/${academicCycleId}`,
      request
    );
  }

  delete(academicCycleId: number): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/academic-cycles/${academicCycleId}`
    );
  }
}
