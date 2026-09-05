import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateStudentRequest,
  Student
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
}