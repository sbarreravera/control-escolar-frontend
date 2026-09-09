import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { GuardianLoginComponent } from './guardian-login.component';

describe('GuardianLoginComponent', () => {
  let fixture: ComponentFixture<GuardianLoginComponent>;
  let component: GuardianLoginComponent;
  let httpTestingController: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardianLoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(GuardianLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('creates a guardian session without requiring notifications', () => {
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl')
      .mockResolvedValue(true);
    component.schoolCode.set('ESC-TEST-1');
    component.username.set('tutor.test.1');
    component.password.set('segura-123');

    component.submit();

    httpTestingController.expectOne('/api/v1/auth/csrf').flush({
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf',
      token: 'csrf-token'
    });
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
    loginRequest.flush({
      guardianId: 20,
      guardianName: 'Persona de Prueba 1',
      schoolName: 'Escuela de Prueba',
      schoolCode: 'ESC-TEST-1',
      username: 'tutor.test.1',
      device: null,
      notificationsEnabled: false,
      sessionExpiresAt: '2026-12-08T10:00:00-06:00'
    });

    expect(navigateByUrl).toHaveBeenCalledWith(
      '/guardian',
      { replaceUrl: true }
    );
  });
});
