import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  AccessEvent,
  ScanAccessEventRequest
} from './access-event.models';

@Injectable({
  providedIn: 'root'
})
export class AccessEventService {

  private readonly http = inject(HttpClient);

  scan(
    request: ScanAccessEventRequest
  ): Observable<AccessEvent> {
    return this.http.post<AccessEvent>(
      '/api/v1/access-events/scan',
      request
    );
  }
}