import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import {
  FirebaseMessagingService
} from '../../core/firebase/firebase-messaging.service';
import { GuardianLoginComponent } from './guardian-login.component';

describe('GuardianLoginComponent', () => {
  let fixture: ComponentFixture<GuardianLoginComponent>;
  let component: GuardianLoginComponent;
  let httpTestingController: HttpTestingController;
  let router: Router;

  const messagingService = {
    getExistingTokenIfPermitted: vi.fn()
  };

  beforeEach(async () => {
    messagingService.getExistingTokenIfPermitted.mockReset();
    messagingService.getExistingTokenIfPermitted.mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [GuardianLoginComponent],
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
    fixture = TestBed.createComponent(GuardianLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('creates a guardian session without requiring notifications', async () => {
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl')
      .mockResolvedValue(true);
    component.schoolCode.set('ESC-TEST-1');
    component.username.set('tutor.test.1');
    component.password.set('segura-123');

    const submitPromise = component.submit();
    await Promise.resolve();

    httpTestingController.expectOne('/api/v1/auth/csrf').flush({
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf',
      token: 'csrf-token'
    });
    await Promise.resolve();

    const loginRequest = httpTestingController.expectOne(
      '/api/v1/guardian-auth/login'
    );
    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.body).toEqual(expect.objectContaining({
      schoolCode: 'ESC-TEST-1',
      username: 'tutor.test.1',
      password: 'segura-123',
      fcmToken: null
    }));
    loginRequest.flush(loginResponse(false));
    await submitPromise;

    expect(navigateByUrl).toHaveBeenCalledWith(
      '/guardian',
      { replaceUrl: true }
    );
  });

  it('reuses an existing push token when permission was already granted', async () => {
    messagingService.getExistingTokenIfPermitted
      .mockResolvedValue('existing-fcm-token');
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.schoolCode.set('ESC-TEST-1');
    component.username.set('tutor.test.1');
    component.password.set('segura-123');

    const submitPromise = component.submit();
    await Promise.resolve();

    httpTestingController.expectOne('/api/v1/auth/csrf').flush({
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf',
      token: 'csrf-token'
    });
    await Promise.resolve();

    const loginRequest = httpTestingController.expectOne(
      '/api/v1/guardian-auth/login'
    );
    expect(loginRequest.request.body.fcmToken)
      .toBe('existing-fcm-token');
    loginRequest.flush(loginResponse(true));
    await submitPromise;

    expect(messagingService.getExistingTokenIfPermitted)
      .toHaveBeenCalledTimes(1);
  });

  function loginResponse(notificationsEnabled: boolean) {
    return {
      guardianId: 20,
      guardianName: 'Persona de Prueba 1',
      schoolName: 'Escuela de Prueba',
      schoolCode: 'ESC-TEST-1',
      username: 'tutor.test.1',
      device: notificationsEnabled
        ? {
            id: 10,
            guardianId: 20,
            deviceName: 'Dispositivo Apple',
            active: true,
            registeredAt: '2026-09-11T10:00:00-06:00',
            lastUsedAt: null
          }
        : null,
      notificationsEnabled,
      sessionExpiresAt: '2026-12-08T10:00:00-06:00'
    };
  }
});
