import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AccessMonitorFilterOptions,
  AccessMonitorPage,
  AccessMonitorQuery
} from './access-monitor.models';

/** Read-only API; intentionally never calls /scan. */
@Injectable({ providedIn: 'root' })
export class AccessMonitorService {
  private readonly http = inject(HttpClient);

  findPage(query: AccessMonitorQuery): Observable<AccessMonitorPage> {
    let params = new HttpParams()
      .set('schoolId', query.schoolId)
      .set('date', query.date)
      .set('page', query.page)
      .set('size', query.size);

    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.academicCycleId !== undefined) {
      params = params.set('academicCycleId', query.academicCycleId);
    }
    if (query.schoolGroupId !== undefined) {
      params = params.set('schoolGroupId', query.schoolGroupId);
    }
    if (query.eventType) {
      params = params.set('eventType', query.eventType);
    }

    return this.http.get<AccessMonitorPage>(
      '/api/v1/access-events/monitor',
      { params }
    );
  }

  findFilters(schoolId: number): Observable<AccessMonitorFilterOptions> {
    return this.http.get<AccessMonitorFilterOptions>(
      '/api/v1/access-events/monitor/filters',
      { params: { schoolId } }
    );
  }
}
