import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccessMonitorService } from './access-monitor.service';

describe('AccessMonitorService', () => {
  let service: AccessMonitorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AccessMonitorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('queries scoped access history without creating any movement', () => {
    service.findPage({
      schoolId: 44,
      date: '2026-11-06',
      page: 1,
      size: 25,
      search: 'Ana',
      academicCycleId: 20,
      schoolGroupId: 31,
      eventType: 'ENTRY'
    }).subscribe();

    const request = http.expectOne(req =>
      req.url === '/api/v1/access-events/monitor'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('schoolId')).toBe('44');
    expect(request.request.params.get('date')).toBe('2026-11-06');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('25');
    expect(request.request.params.get('search')).toBe('Ana');
    expect(request.request.params.get('academicCycleId')).toBe('20');
    expect(request.request.params.get('schoolGroupId')).toBe('31');
    expect(request.request.params.get('eventType')).toBe('ENTRY');

    http.expectNone('/api/v1/access-events/scan');

    request.flush({
      date: '2026-11-06',
      content: [],
      page: 1,
      size: 25,
      totalElements: 0,
      totalPages: 0,
      first: false,
      last: true
    });
  });

  it('loads filter options under the monitor permission', () => {
    service.findFilters(44).subscribe(result => {
      expect(result.cycles[0].name).toBe('2026-2027');
    });

    const request = http.expectOne(req =>
      req.url === '/api/v1/access-events/monitor/filters'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('schoolId')).toBe('44');

    request.flush({
      cycles: [{ id: 20, name: '2026-2027', active: true }],
      groups: [{ id: 31, academicCycleId: 20, gradeName: '1', groupName: 'A', active: true }]
    });
  });
});
