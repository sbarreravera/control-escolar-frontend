import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  AcademicCycle,
  CreateAcademicCycleRequest
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
}
