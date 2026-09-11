import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Communication,
  CommunicationAudiencePreview,
  CommunicationAudienceRequest,
  CommunicationRecipient,
  CreateCommunicationRequest,
  UpdateScheduledCommunicationRequest
} from './communication.models';

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {

  private readonly http = inject(HttpClient);

  preview(
    request: CommunicationAudienceRequest
  ): Observable<CommunicationAudiencePreview> {
    return this.http.post<CommunicationAudiencePreview>(
      '/api/v1/communications/preview',
      request
    );
  }

  create(
    request: CreateCommunicationRequest
  ): Observable<Communication> {
    return this.http.post<Communication>(
      '/api/v1/communications',
      request
    );
  }

  updateScheduled(
    communicationId: number,
    request: UpdateScheduledCommunicationRequest
  ): Observable<Communication> {
    return this.http.put<Communication>(
      `/api/v1/communications/${communicationId}`,
      request
    );
  }

  cancel(communicationId: number): Observable<Communication> {
    return this.http.post<Communication>(
      `/api/v1/communications/${communicationId}/cancel`,
      {}
    );
  }

  findHistory(schoolId: number): Observable<Communication[]> {
    return this.http.get<Communication[]>(
      '/api/v1/communications',
      { params: { schoolId } }
    );
  }

  findRecipients(
    communicationId: number
  ): Observable<CommunicationRecipient[]> {
    return this.http.get<CommunicationRecipient[]>(
      `/api/v1/communications/${communicationId}/recipients`
    );
  }
}
