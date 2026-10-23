import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { QrTestService } from './qr-test.service';

describe('QrTestService', () => {
  let service: QrTestService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(QrTestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('only calls the read-only QR test endpoint', () => {
    const token = 'an-example-qr-token';
    let resultStatus: string | undefined;

    service.validate(token, 44).subscribe(result => {
      resultStatus = result.status;
    });

    const req = http.expectOne('/api/v1/qr-tests/validate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ qrToken: token, schoolId: 44 });
    http.expectNone('/api/v1/access-events/scan');

    req.flush({
      valid: true,
      status: 'VALID',
      studentId: 1,
      studentName: 'Alumno Demo',
      enrollmentNumber: '261B01',
      schoolName: 'Técnica 44',
      gradeName: '1',
      groupName: 'B',
      credentialExpiresAt: null
    });

    expect(resultStatus).toBe('VALID');
  });
});
