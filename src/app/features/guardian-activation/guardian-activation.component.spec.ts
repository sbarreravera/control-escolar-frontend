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
    flushInitialLoad();

    const request = httpTestingController.expectOne(
      item => item.url === '/api/v1/guardian-activations'
    );
    expect(request.request.params.get('academicCycleId')).toBe('30');
    request.flush(pageResponse([statusResponse]));

    expect(component.statuses()).toHaveLength(1);
    expect(component.academicCycleId()).toBe(30);
    expect(component.filteredStatuses()[0].guardianName)
      .toBe('María Pérez');
  });

  it('generates one-time links for the selected guardians', () => {
    flushInitialLoad();
    httpTestingController
      .expectOne(request => request.url === '/api/v1/guardian-activations')
      .flush(pageResponse([statusResponse]));

    component.toggleGuardian(20);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
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
      .expectOne(request => request.url === '/api/v1/guardian-activations')
      .flush(pageResponse([]));

    expect(component.generatedInvitations()).toHaveLength(1);
    expect(component.generatedInvitations()[0].activationUrl)
      .toContain('#/guardian/activate?token=secure-token');
    expect(component.selectedCount()).toBe(0);
  });

  it('keeps explicit selections while navigating between pages', () => {
    flushInitialLoad();
    httpTestingController
      .expectOne(request => request.url === '/api/v1/guardian-activations')
      .flush(pageResponse([statusResponse], 0, 2, 26));

    component.toggleGuardian(20);
    component.goToPage(1);

    const request = httpTestingController.expectOne(
      item => item.url === '/api/v1/guardian-activations' &&
        item.params.get('page') === '1'
    );
    request.flush(pageResponse([], 1, 2, 26));

    expect(component.selectedCount()).toBe(1);
    expect(component.page()).toBe(1);
  });

  it('selects every guardian matching the current academic filters', () => {
    flushInitialLoad();
    httpTestingController
      .expectOne(request => request.url === '/api/v1/guardian-activations')
      .flush(pageResponse([statusResponse], 0, 2, 26));

    component.selectAllMatching();

    const request = httpTestingController.expectOne(
      item => item.url === '/api/v1/guardian-activations/selection'
    );
    expect(request.request.params.get('academicCycleId')).toBe('30');
    expect(request.request.params.get('state')).toBe('NOT_ACTIVE');
    request.flush({ guardianIds: [20, 21, 22], totalSelected: 3 });

    expect(component.selectedCount()).toBe(3);
    expect(component.allMatchingSelected()).toBe(true);
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
    activeSessions: 0,
    students: [{
      studentId: 40,
      enrollmentNumber: 'A-040',
      fullName: 'Alumno Ejemplo',
      schoolGroupId: 50,
      gradeName: '1.er semestre',
      groupName: 'Grupo 1'
    }]
  };

  const cycleResponse = {
    id: 30,
    schoolId: 10,
    schoolName: 'Colegio San Felipe de Jesús',
    name: '2026 - 2027',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    active: true,
    createdAt: '2026-08-01T00:00:00-06:00',
    updatedAt: '2026-08-01T00:00:00-06:00'
  };

  function flushInitialLoad(): void {
    httpTestingController
      .expectOne('/api/v1/academic-cycles?schoolId=10')
      .flush([cycleResponse]);
    httpTestingController
      .expectOne('/api/v1/school-groups?academicCycleId=30')
      .flush([]);

  }

  function pageResponse(
    content: object[],
    page = 0,
    totalPages = content.length === 0 ? 0 : 1,
    totalElements = content.length
  ): object {
    return {
      content,
      page,
      size: 25,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
      summary: {
        totalGuardians: totalElements,
        notInvited: totalElements,
        pending: 0,
        active: 0,
        requiresActivation: totalElements,
        missingContact: 0
      }
    };
  }
});
