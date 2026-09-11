import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateStudentRequest,
  Student,
  StudentPage,
  StudentPageQuery,
  UpdateStudentRequest
} from './student.models';

@Injectable({
  providedIn: 'root'
})
export class StudentService {

  private readonly http = inject(HttpClient);

  findAllBySchool(
    schoolId: number
  ): Observable<Student[]> {
    return this.http.get<Student[]>(
      '/api/v1/students',
      {
        params: {
          schoolId
        }
      }
    );
  }

  findPage(
    query: StudentPageQuery
  ): Observable<StudentPage> {
    let params = new HttpParams()
      .set('schoolId', query.schoolId)
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', query.sort)
      .set('direction', query.direction);

    if (query.search) {
      params = params.set('search', query.search);
    }

    if (query.academicCycleId !== undefined) {
      params = params.set(
        'academicCycleId',
        query.academicCycleId
      );
    }

    if (query.schoolGroupId !== undefined) {
      params = params.set(
        'schoolGroupId',
        query.schoolGroupId
      );
    }

    if (query.active !== undefined) {
      params = params.set('active', query.active);
    }

    return this.http.get<StudentPage>(
      '/api/v1/students/page',
      { params }
    );
  }

  findById(
    studentId: number
  ): Observable<Student> {
    return this.http.get<Student>(
      `/api/v1/students/${studentId}`
    );
  }

  create(
    request: CreateStudentRequest
  ): Observable<Student> {
    return this.http.post<Student>(
      '/api/v1/students',
      request
    );
  }

  update(
    studentId: number,
    request: UpdateStudentRequest
  ): Observable<Student> {
    return this.http.put<Student>(
      `/api/v1/students/${studentId}`,
      request
    );
  }
}
