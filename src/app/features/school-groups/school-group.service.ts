import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateSchoolGroupRequest,
  SchoolGroup
} from './school-group.models';

@Injectable({
  providedIn: 'root'
})
export class SchoolGroupService {

  private readonly http = inject(HttpClient);

  findAllByAcademicCycle(
    academicCycleId: number
  ): Observable<SchoolGroup[]> {
    return this.http.get<SchoolGroup[]>(
      '/api/v1/school-groups',
      {
        params: {
          academicCycleId
        }
      }
    );
  }

  create(
    request: CreateSchoolGroupRequest
  ): Observable<SchoolGroup> {
    return this.http.post<SchoolGroup>(
      '/api/v1/school-groups',
      request
    );
  }
}
