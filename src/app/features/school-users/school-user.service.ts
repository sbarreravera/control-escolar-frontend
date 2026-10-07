import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateSchoolUserRequest,
  SchoolModuleDefinition,
  SchoolUser,
  UpdateSchoolUserRequest
} from './school-user.models';

@Injectable({
  providedIn: 'root'
})
export class SchoolUserService {

  private readonly http = inject(HttpClient);

  findModules(): Observable<SchoolModuleDefinition[]> {
    return this.http.get<SchoolModuleDefinition[]>(
      '/api/v1/school-users/modules'
    );
  }

  findAll(schoolId: number): Observable<SchoolUser[]> {
    const params = new HttpParams()
      .set('schoolId', schoolId);

    return this.http.get<SchoolUser[]>(
      '/api/v1/school-users',
      {
        params
      }
    );
  }

  create(
    request: CreateSchoolUserRequest
  ): Observable<SchoolUser> {
    return this.http.post<SchoolUser>(
      '/api/v1/school-users',
      request
    );
  }

  update(
    userId: number,
    request: UpdateSchoolUserRequest
  ): Observable<SchoolUser> {
    return this.http.put<SchoolUser>(
      `/api/v1/school-users/${userId}`,
      request
    );
  }
}
