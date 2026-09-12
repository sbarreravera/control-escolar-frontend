import {
  provideHttpClient
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import {
  AuthenticatedUser
} from '../../core/auth/auth.models';
import {
  AuthService
} from '../../core/auth/auth.service';
import {
  GuardiansComponent
} from './guardians.component';

describe('GuardiansComponent', () => {
  let component: GuardiansComponent;
  let fixture: ComponentFixture<GuardiansComponent>;
  let httpTestingController: HttpTestingController;

  const authenticatedUser =
    signal<AuthenticatedUser | null>({
      id: 2,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      fullName: 'Administrador de prueba',
      email: 'admin@colegiosanfelipe.test',
      role: 'ADMIN'
    });

  const authServiceMock = {
    currentUser: authenticatedUser.asReadonly()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GuardiansComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: authServiceMock
        }
      ]
    }).compileComponents();

    httpTestingController =
      TestBed.inject(HttpTestingController);

    fixture =
      TestBed.createComponent(GuardiansComponent);

    component = fixture.componentInstance;

    fixture.detectChanges();

    const guardiansRequest =
      httpTestingController.expectOne(
        request =>
          request.url === '/api/v1/guardians' &&
          request.params.get('schoolId') === '1'
      );

    const studentsRequest =
      httpTestingController.expectOne(
        request =>
          request.url === '/api/v1/students' &&
          request.params.get('schoolId') === '1'
      );

    expect(
      guardiansRequest.request.method
    ).toBe('GET');

    expect(
      studentsRequest.request.method
    ).toBe('GET');

    guardiansRequest.flush([]);
    studentsRequest.flush([]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update guardian contact data without changing its key', () => {
    const guardian = {
      id: 10,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      externalReference: 'TUT-PRUEBA-001',
      fullName: 'Samuel Barrera Vera',
      phone: null,
      email: null,
      active: true,
      createdAt: '2026-09-09T10:00:00-06:00',
      updatedAt: '2026-09-09T10:00:00-06:00'
    };

    component.guardians.set([guardian]);
    component.startEditing(guardian);
    component.guardianForm.patchValue({
      phone: '7737361800',
      email: 'TRIPLE_SEVEN_SAM@HOTMAIL.COM'
    });

    component.createGuardian();

    const updateRequest =
      httpTestingController.expectOne(
        '/api/v1/guardians/10'
      );

    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({
      fullName: 'Samuel Barrera Vera',
      phone: '7737361800',
      email: 'triple_seven_sam@hotmail.com'
    });

    updateRequest.flush({
      ...guardian,
      phone: '7737361800',
      email: 'triple_seven_sam@hotmail.com',
      updatedAt: '2026-09-09T11:00:00-06:00'
    });

    expect(component.editingGuardianId()).toBeNull();
    expect(component.guardians()[0].externalReference)
      .toBe('TUT-PRUEBA-001');
    expect(component.guardians()[0].phone)
      .toBe('7737361800');
  });

  it('warns about linked students before permanently deleting a guardian', () => {
    const guardian = {
      id: 20,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      externalReference: 'EJE-02',
      fullName: 'José de Jesús Corona',
      phone: '5578971234',
      email: 'jose.corona@gmail.com',
      active: true,
      createdAt: '2026-09-11T10:00:00-06:00',
      updatedAt: '2026-09-11T10:00:00-06:00'
    };
    const confirmSpy = vi.spyOn(window, 'confirm')
      .mockReturnValue(true);

    component.guardians.set([guardian]);
    component.requestGuardianDeletion(guardian);

    const impactRequest = httpTestingController.expectOne(
      '/api/v1/guardians/20/deletion-impact'
    );
    expect(impactRequest.request.method).toBe('GET');
    impactRequest.flush({
      guardianId: 20,
      guardianName: 'José de Jesús Corona',
      externalReference: 'EJE-02',
      students: [
        {
          studentId: 30,
          studentName: 'Alumno Ejemplo',
          enrollmentNumber: 'MAT-001'
        }
      ],
      activeNotificationDeviceCount: 1,
      notificationLogCount: 2,
      communicationRecipientCount: 1
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Alumno Ejemplo')
    );
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('NO se eliminarán')
    );

    const deleteRequest = httpTestingController.expectOne(
      '/api/v1/guardians/20'
    );
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null, {
      status: 204,
      statusText: 'No Content'
    });

    expect(component.guardians()).toEqual([]);
    expect(component.successMessage())
      .toContain('fue eliminado definitivamente');

    confirmSpy.mockRestore();
  });
});
