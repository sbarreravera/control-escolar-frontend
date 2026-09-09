import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuardianHomeComponent } from './guardian-home.component';

describe('GuardianHomeComponent', () => {
  let fixture: ComponentFixture<GuardianHomeComponent>;
  let component: GuardianHomeComponent;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardianHomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GuardianHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('shows the guardian identity resolved from the secure session', () => {
    httpTestingController.expectOne('/api/v1/guardian/me').flush({
      guardianId: 20,
      schoolId: 10,
      guardianName: 'María Pérez',
      schoolName: 'Colegio San Felipe de Jesús',
      sessionExpiresAt: '2026-10-09T10:00:00-06:00'
    });

    expect(component.identity()?.guardianName).toBe('María Pérez');
    expect(component.errorMessage()).toBeNull();
  });

  it('revokes the current session when the guardian logs out', () => {
    httpTestingController.expectOne('/api/v1/guardian/me').flush({
      guardianId: 20,
      schoolId: 10,
      guardianName: 'María Pérez',
      schoolName: 'Colegio San Felipe de Jesús',
      sessionExpiresAt: '2026-10-09T10:00:00-06:00'
    });

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
  });
});
