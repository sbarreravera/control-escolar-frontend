import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateSchoolRequest,
  School
} from './school.models';

@Injectable({
  providedIn: 'root'
})
export class SchoolService {

  private readonly http = inject(HttpClient);

  findAll(): Observable<School[]> {
    return this.http.get<School[]>(
      '/api/v1/schools'
    );
  }

  create(
    request: CreateSchoolRequest
  ): Observable<School> {
    return this.http.post<School>(
      '/api/v1/schools',
      request
    );
  }
}