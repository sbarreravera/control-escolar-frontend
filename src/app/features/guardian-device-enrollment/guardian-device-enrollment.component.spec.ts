import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter
} from '@angular/router';

import {
  FirebaseMessagingService
} from '../../core/firebase/firebase-messaging.service';
import {
  GuardianDeviceEnrollmentComponent
} from './guardian-device-enrollment.component';

describe('GuardianDeviceEnrollmentComponent', () => {
  let fixture: ComponentFixture<GuardianDeviceEnrollmentComponent>;
  let component: GuardianDeviceEnrollmentComponent;
  let httpTestingController: HttpTestingController;

  const messagingService = {
    requestPermissionAndGetToken: vi.fn()
  };

  beforeEach(async () => {
    messagingService.requestPermissionAndGetToken.mockReset();
    await TestBed.configureTestingModule({
      imports: [GuardianDeviceEnrollmentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                token: 'secure-token'
              })
            }
          }
        },
        {
          provide: FirebaseMessagingService,
          useValue: messagingService
        }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GuardianDeviceEnrollmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('turns a used link into a login recovery path', async () => {
    httpTestingController.expectOne(
      request => request.url ===
        '/api/v1/guardian-device-enrollments/status'
    ).flush(invitationStatus('USED'));
    await fixture.whenStable();
    httpTestingController.expectOne('/api/v1/guardian/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(component.invitation()?.status).toBe('USED');
    expect(fixture.nativeElement.textContent)
      .toContain('Este enlace ya fue utilizado');
    expect(fixture.nativeElement.textContent)
      .toContain('Iniciar sesión');
  });

  it('creates the password even when notifications are declined', async () => {
    httpTestingController.expectOne(
      request => request.url ===
        '/api/v1/guardian-device-enrollments/status'
    ).flush(invitationStatus('VALID'));
    await fixture.whenStable();
    httpTestingController.expectOne('/api/v1/guardian/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    component.password.set('segura-123');
    component.passwordConfirmation.set('segura-123');
    component.enableNotifications.set(false);
    const completionPromise = component.completeAccess();
    await Promise.resolve();

    httpTestingController.expectOne('/api/v1/auth/csrf').flush({
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf',
      token: 'csrf-token'
    });
    await Promise.resolve();
    const completion = httpTestingController.expectOne(
      '/api/v1/guardian-device-enrollments/complete'
    );
    expect(completion.request.body).toEqual(expect.objectContaining({
      enrollmentToken: 'secure-token',
      fcmToken: null,
      password: 'segura-123'
    }));
    completion.flush({
      guardianId: 20,
      guardianName: 'Persona de Prueba 1',
      schoolName: 'Escuela de Prueba',
      schoolCode: 'ESC-TEST-1',
      username: 'tutor.test.1',
      device: null,
      notificationsEnabled: false,
      sessionExpiresAt: '2026-12-08T10:00:00-06:00'
    });
    await completionPromise;

    expect(component.completed()).toBe(true);
    expect(messagingService.requestPermissionAndGetToken)
      .not.toHaveBeenCalled();
  });

  function invitationStatus(status: 'VALID' | 'USED') {
    return {
      status,
      purpose: 'ACTIVATION',
      guardianId: 20,
      guardianName: 'Persona de Prueba 1',
      schoolName: 'Escuela de Prueba',
      schoolCode: 'ESC-TEST-1',
      username: 'tutor.test.1',
      accountActivated: status === 'USED',
      expiresAt: '2026-09-16T10:00:00-06:00'
    };
  }
});
