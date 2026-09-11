import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GuardianAccessEvent,
  GuardianAccessEventPage,
  GuardianHistoryQuery,
  GuardianStudent
} from './guardian-portal.models';

@Injectable({
  providedIn: 'root'
})
export class GuardianPortalService {

  private readonly http = inject(HttpClient);

  findStudents(): Observable<GuardianStudent[]> {
    return this.http.get<GuardianStudent[]>(
      '/api/v1/guardian/students'
    );
  }

  findHistory(
    query: GuardianHistoryQuery
  ): Observable<GuardianAccessEventPage> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 20);

    if (query.studentId !== undefined) {
      params = params.set('studentId', query.studentId);
    }
    if (query.eventType !== undefined) {
      params = params.set('eventType', query.eventType);
    }
    if (query.occurredFrom !== undefined) {
      params = params.set('occurredFrom', query.occurredFrom);
    }
    if (query.occurredTo !== undefined) {
      params = params.set('occurredTo', query.occurredTo);
    }

    return this.http.get<GuardianAccessEventPage>(
      '/api/v1/guardian/access-events',
      { params }
    );
  }

  findEvent(eventId: number): Observable<GuardianAccessEvent> {
    return this.http.get<GuardianAccessEvent>(
      `/api/v1/guardian/access-events/${eventId}`
    );
  }
}
