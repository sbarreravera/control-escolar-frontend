import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardSummary } from './dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private readonly http = inject(HttpClient);

  getSummary(
    schoolId: number,
    from: string,
    to: string
  ): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(
      '/api/v1/dashboard/summary',
      {
        params: {
          schoolId,
          from,
          to
        }
      }
    );
  }
}
