import {
  provideHttpClient
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import {
  signal
} from '@angular/core';
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
  StudentsComponent
} from './students.component';

describe('StudentsComponent', () => {
  let component: StudentsComponent;
  let fixture: ComponentFixture<StudentsComponent>;
  let httpTestingController: HttpTestingController;

  const authenticatedUser = signal<AuthenticatedUser | null>({
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
        StudentsComponent
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
      TestBed.createComponent(StudentsComponent);

    component = fixture.componentInstance;

    fixture.detectChanges();

    const request = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/students' &&
        request.params.get('schoolId') === '1'
    );

    expect(request.request.method).toBe('GET');

    request.flush([]);

    const academicCyclesRequest =
      httpTestingController.expectOne(
        request =>
          request.url === '/api/v1/academic-cycles' &&
          request.params.get('schoolId') === '1'
      );

    expect(
      academicCyclesRequest.request.method
    ).toBe('GET');

    academicCyclesRequest.flush([]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update a student and their school group', () => {
    const student = {
      id: 40,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      enrollmentNumber: 'MAT-001',
      firstName: 'Ana',
      lastName: 'Pérez',
      gradeName: 'Segundo grado',
      groupName: 'B',
      schoolGroupId: 30,
      academicCycleId: 20,
      academicCycleName: '2026-2027',
      active: true,
      createdAt: '2026-09-08T10:00:00Z',
      updatedAt: '2026-09-08T10:00:00Z'
    };

    component.students.set([student]);
    component.startEditing(student);

    const groupsRequest =
      httpTestingController.expectOne(
        request =>
          request.url === '/api/v1/school-groups' &&
          request.params.get('academicCycleId') === '20'
      );

    expect(groupsRequest.request.method).toBe('GET');

    groupsRequest.flush([
      {
        id: 30,
        schoolId: 1,
        academicCycleId: 20,
        academicCycleName: '2026-2027',
        gradeName: 'Primer grado',
        groupName: 'A',
        active: true,
        createdAt: '2026-09-08T10:00:00Z',
        updatedAt: '2026-09-08T10:00:00Z'
      }
    ]);

    component.studentForm.controls.firstName
      .setValue('Mariana');

    component.saveStudent();

    const updateRequest =
      httpTestingController.expectOne(
        '/api/v1/students/40'
      );

    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({
      enrollmentNumber: 'MAT-001',
      firstName: 'Mariana',
      lastName: 'Pérez',
      schoolGroupId: 30
    });

    updateRequest.flush({
      ...student,
      firstName: 'Mariana',
      gradeName: 'Primer grado',
      groupName: 'A'
    });

    expect(component.students()).toHaveLength(1);
    expect(component.students()[0].firstName)
      .toBe('Mariana');
    expect(component.isEditing()).toBe(false);
  });
});
