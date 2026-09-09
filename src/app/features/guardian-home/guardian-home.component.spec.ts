import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import {
  FirebaseMessagingService
} from '../../core/firebase/firebase-messaging.service';
import { GuardianHomeComponent } from './guardian-home.component';

describe('GuardianHomeComponent', () => {
  let fixture: ComponentFixture<GuardianHomeComponent>;
  let component: GuardianHomeComponent;
  let httpTestingController: HttpTestingController;
  let router: Router;

  const messagingService = {
    listenForForegroundAccessEvents: vi.fn()
      .mockResolvedValue(vi.fn())
  };

  beforeEach(async () => {
    messagingService.listenForForegroundAccessEvents.mockClear();

    await TestBed.configureTestingModule({
      imports: [GuardianHomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: FirebaseMessagingService,
          useValue: messagingService
        }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(GuardianHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('shows the guardian identity and loads the portal data', () => {
    flushIdentityAndPortal();

    expect(component.identity()?.guardianName).toBe('Persona de Prueba 1');
    expect(component.students()).toHaveLength(1);
    expect(component.events()).toHaveLength(1);
    expect(component.errorMessage()).toBeNull();
    expect(
      messagingService.listenForForegroundAccessEvents
    ).toHaveBeenCalledOnce();
  });

  it('does not send a manipulable guardian or school id', () => {
    flushIdentity();

    httpTestingController
      .expectOne('/api/v1/guardian/students')
      .flush([]);

    const historyRequest = httpTestingController.expectOne(
      request => request.url === '/api/v1/guardian/access-events'
    );

    expect(historyRequest.request.params.get('page')).toBe('0');
    expect(historyRequest.request.params.get('size')).toBe('20');
    expect(historyRequest.request.params.has('guardianId')).toBe(false);
    expect(historyRequest.request.params.has('schoolId')).toBe(false);

    historyRequest.flush(emptyHistory());
  });

  it('filters the history by a related student', () => {
    flushIdentityAndPortal();

    component.viewStudentHistory(30);

    const historyRequest = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/guardian/access-events' &&
        request.params.get('studentId') === '30'
    );

    expect(historyRequest.request.params.has('guardianId')).toBe(false);
    historyRequest.flush(emptyHistory());
  });

  it('revokes the current session when the guardian logs out', () => {
    flushIdentityAndPortal();

    const navigate = vi.spyOn(router, 'navigate')
      .mockResolvedValue(true);
    component.logout();

    httpTestingController.expectOne('/api/v1/auth/csrf').flush({
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf',
      token: 'csrf-token'
    });

    const logoutRequest = httpTestingController.expectOne(
      '/api/v1/guardian/auth/logout'
    );
    expect(logoutRequest.request.method).toBe('POST');
    logoutRequest.flush(null);

    expect(component.identity()).toBeNull();
    expect(component.students()).toEqual([]);
    expect(component.events()).toEqual([]);
    expect(navigate).toHaveBeenCalledWith(
      ['/guardian/login'],
      expect.objectContaining({ replaceUrl: true })
    );
  });

  function flushIdentityAndPortal(): void {
    flushIdentity();

    httpTestingController
      .expectOne('/api/v1/guardian/students')
      .flush([student()]);

    const historyRequest = httpTestingController.expectOne(
      request => request.url === '/api/v1/guardian/access-events'
    );
    historyRequest.flush(history());
  }

  function flushIdentity(): void {
    httpTestingController.expectOne('/api/v1/guardian/me').flush({
      guardianId: 20,
      schoolId: 10,
      guardianName: 'Persona de Prueba 1',
      schoolName: 'Escuela de Prueba',
      schoolCode: 'ESC-TEST-1',
      username: 'tutor.test.1',
      notificationsEnabled: true,
      sessionExpiresAt: '2026-10-09T10:00:00-06:00'
    });
  }

  function student() {
    return {
      studentId: 30,
      enrollmentNumber: 'MAT-TEST-002',
      fullName: 'Persona de Prueba 4',
      active: true,
      relationship: 'Madre',
      primaryContact: true,
      academicCycleId: 60,
      academicCycleName: '2026 - 2027',
      schoolGroupId: 50,
      gradeName: '5to Semestre',
      groupName: 'Grupo 1',
      latestEvent: accessEvent()
    };
  }

  function accessEvent() {
    return {
      id: 40,
      studentId: 30,
      studentName: 'Persona de Prueba 4',
      enrollmentNumber: 'MAT-TEST-002',
      eventType: 'ENTRY',
      occurredAt: '2026-09-09T08:15:00-06:00'
    };
  }

  function history() {
    return {
      content: [accessEvent()],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true
    };
  }

  function emptyHistory() {
    return {
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true
    };
  }
});
