import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthenticatedUser } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import {
  GuardianActivationComponent
} from './guardian-activation.component';

describe('GuardianActivationComponent', () => {
  let fixture: ComponentFixture<GuardianActivationComponent>;
  let component: GuardianActivationComponent;
  let httpTestingController: HttpTestingController;

  const currentUser = signal<AuthenticatedUser | null>({
    id: 2,
    schoolId: 10,
    schoolName: 'Colegio San Felipe de Jesús',
    fullName: 'Laura Cruz Reyes',
    email: 'prefectura@colegio.test',
    role: 'ADMIN'
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardianActivationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: currentUser.asReadonly()
          }
        }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GuardianActivationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('loads activation states for the authenticated school', () => {
    const request = httpTestingController.expectOne(
      item => item.url === '/api/v1/guardian-activations' &&
        item.params.get('schoolId') === '10'
    );
    request.flush([statusResponse]);

    expect(component.statuses()).toHaveLength(1);
    expect(component.filteredStatuses()[0].guardianName)
      .toBe('María Pérez');
  });

  it('generates one-time links for the selected guardians', () => {
    httpTestingController
      .expectOne('/api/v1/guardian-activations?schoolId=10')
      .flush([statusResponse]);

    component.toggleGuardian(20);
    component.createInvitations();

    const request = httpTestingController.expectOne(
      '/api/v1/guardian-activations/invitations'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      schoolId: 10,
      guardianIds: [20]
    });
    request.flush({
      batchId: 'ad403510-2e74-4568-9452-7159f237efbb',
      expiresAt: '2026-09-16T10:00:00-06:00',
      invitationsCreated: 1,
      invitations: [{
        guardianId: 20,
        externalReference: 'TUT-020',
        guardianName: 'María Pérez',
        phone: '7710000000',
        email: null,
        schoolName: 'Colegio San Felipe de Jesús',
        enrollmentToken: 'secure-token',
        expiresAt: '2026-09-16T10:00:00-06:00'
      }]
    });

    httpTestingController
      .expectOne('/api/v1/guardian-activations?schoolId=10')
      .flush([]);

    expect(component.generatedInvitations()).toHaveLength(1);
    expect(component.generatedInvitations()[0].activationUrl)
      .toContain('#/guardian/activate?token=secure-token');
    expect(component.selectedCount()).toBe(0);
  });

  const statusResponse = {
    guardianId: 20,
    externalReference: 'TUT-020',
    guardianName: 'María Pérez',
    phone: '7710000000',
    email: null,
    guardianActive: true,
    activationState: 'NOT_INVITED',
    invitationCreatedAt: null,
    invitationExpiresAt: null,
    activatedAt: null,
    activeDevices: 0,
    activeSessions: 0
  };
});
