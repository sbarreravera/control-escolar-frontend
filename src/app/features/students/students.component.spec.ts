import {
  provideHttpClient
} from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
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
  Student,
  StudentPage
} from './student.models';
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

  const student: Student = {
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

    flushStudentPage(
      expectStudentPageRequest(0, 'studentName', 'asc'),
      []
    );

    const academicCyclesRequest =
      httpTestingController.expectOne(
        request =>
          request.url === '/api/v1/academic-cycles' &&
          request.params.get('schoolId') === '1'
      );

    expect(
      academicCyclesRequest.request.method
    ).toBe('GET');

    academicCyclesRequest.flush([
      {
        id: 20,
        schoolId: 1,
        schoolName: 'Colegio San Felipe',
        name: '2026-2027',
        startDate: '2026-08-31',
        endDate: '2027-07-09',
        active: true,
        createdAt: '2026-09-08T10:00:00Z',
        updatedAt: '2026-09-08T10:00:00Z'
      }
    ]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request sorting on the server', () => {
    component.changeSort('enrollmentNumber');

    flushStudentPage(
      expectStudentPageRequest(0, 'enrollmentNumber', 'asc'),
      [student]
    );

    component.changeSort('enrollmentNumber');

    flushStudentPage(
      expectStudentPageRequest(0, 'enrollmentNumber', 'desc'),
      [student]
    );

    expect(component.students()).toEqual([student]);
  });

  it('should debounce a search and send it to the server', async () => {
    component.filterForm.controls.search.setValue('  MAT-001  ');
    component.onSearchInput();

    await new Promise(resolve => setTimeout(resolve, 400));

    const searchRequest = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/students/page' &&
        request.params.get('search') === 'MAT-001'
    );

    flushStudentPage(searchRequest, [student]);

    expect(component.appliedSearch()).toBe('MAT-001');
  });

  it('should filter groups by the selected academic cycle', () => {
    component.filterForm.controls.academicCycleId.setValue(20);
    component.onFilterCycleChange();

    const groupsRequest =
      httpTestingController.expectOne(
        request =>
          request.url === '/api/v1/school-groups' &&
          request.params.get('academicCycleId') === '20'
      );

    groupsRequest.flush([]);

    const pageRequest = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/students/page' &&
        request.params.get('academicCycleId') === '20'
    );

    flushStudentPage(pageRequest, []);

    expect(
      component.filterForm.controls.schoolGroupId.value
    ).toBe(0);
  });

  it('should update a student in the modal and refresh its page', () => {
    component.students.set([student]);
    component.startEditing(student);

    expect(component.studentModalVisible()).toBe(true);

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

    const updatedStudent = {
      ...student,
      firstName: 'Mariana',
      gradeName: 'Primer grado',
      groupName: 'A'
    };

    updateRequest.flush(updatedStudent);

    flushStudentPage(
      expectStudentPageRequest(0, 'studentName', 'asc'),
      [updatedStudent]
    );

    expect(component.students()[0].firstName)
      .toBe('Mariana');
    expect(component.isEditing()).toBe(false);
    expect(component.studentModalVisible()).toBe(false);
  });

  function expectStudentPageRequest(
    page: number,
    sort: string,
    direction: string
  ): TestRequest {
    const request = httpTestingController.expectOne(
      candidate =>
        candidate.url === '/api/v1/students/page' &&
        candidate.params.get('schoolId') === '1' &&
        candidate.params.get('page') === String(page) &&
        candidate.params.get('size') === '25' &&
        candidate.params.get('sort') === sort &&
        candidate.params.get('direction') === direction &&
        !candidate.params.has('active')
    );

    expect(request.request.method).toBe('GET');
    return request;
  }

  function flushStudentPage(
    request: TestRequest,
    content: Student[]
  ): void {
    request.flush({
      content,
      page: 0,
      size: 25,
      totalElements: content.length,
      totalPages: content.length === 0 ? 0 : 1,
      first: true,
      last: true
    } satisfies StudentPage);
  }
});
