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
  Student
} from '../students/student.models';
import {
  CredentialsComponent
} from './credentials.component';

describe('CredentialsComponent', () => {
  let component: CredentialsComponent;
  let fixture: ComponentFixture<CredentialsComponent>;
  let httpTestingController: HttpTestingController;

  const authenticatedUser =
    signal<AuthenticatedUser | null>({
      id: 2,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      fullName: 'Administrador de prueba',
      email: 'admin@colegiosanfelipe.test',
      role: 'ADMIN',
    moduleKeys: [
      'CREDENTIALS'
    ]
    });

  const authServiceMock = {
    currentUser: authenticatedUser.asReadonly()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CredentialsComponent
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
      TestBed.createComponent(CredentialsComponent);

    component = fixture.componentInstance;

    fixture.detectChanges();

    const studentsRequest =
      httpTestingController.expectOne(
        request =>
          request.url === '/api/v1/students' &&
          request.params.get('schoolId') === '1'
      );

    expect(
      studentsRequest.request.method
    ).toBe('GET');

    studentsRequest.flush([]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  const sampleStudents: Student[] = [
    {
      id: 101,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      enrollmentNumber: '261A01',
      firstName: 'Génesis',
      lastName: 'Acosta Herrera',
      gradeName: '1',
      groupName: 'A',
      schoolGroupId: 11,
      academicCycleId: 26,
      academicCycleName: '2026 - 2027',
      active: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 102,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      enrollmentNumber: '261B02',
      firstName: 'Ana',
      lastName: 'Pérez López',
      gradeName: '1',
      groupName: 'B',
      schoolGroupId: 12,
      academicCycleId: 26,
      academicCycleName: '2026 - 2027',
      active: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 103,
      schoolId: 1,
      schoolName: 'Colegio San Felipe',
      enrollmentNumber: '251A03',
      firstName: 'Luis',
      lastName: 'García',
      gradeName: '1',
      groupName: 'A',
      schoolGroupId: 9,
      academicCycleId: 25,
      academicCycleName: '2025 - 2026',
      active: false,
      createdAt: '',
      updatedAt: ''
    }
  ];

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters by names, surname-first order, accents and enrollment', () => {
    component.students.set(sampleStudents);

    component.filterForm.controls.search.setValue('genesis');
    component.onSearchInput();
    expect(component.filteredStudents().map(s => s.id)).toEqual([101]);

    component.filterForm.controls.search.setValue('PEREZ LOPEZ ANA');
    component.onSearchInput();
    expect(component.filteredStudents().map(s => s.id)).toEqual([102]);

    component.filterForm.controls.search.setValue('251A03');
    component.onSearchInput();
    expect(component.filteredStudents().map(s => s.id)).toEqual([103]);

    component.clearSearch();
    expect(component.filteredStudents()).toHaveLength(3);
  });

  it('filters by cycle and dependent school group', () => {
    component.students.set(sampleStudents);

    expect(component.academicCycleOptions().map(c => c.id)).toEqual([25, 26]);
    expect(component.schoolGroupOptions()).toHaveLength(0);

    component.filterForm.controls.academicCycleId.setValue(26);
    component.onCycleFilterChange();

    expect(component.filteredStudents().map(s => s.id)).toEqual([101, 102]);
    expect(component.schoolGroupOptions().map(g => g.id)).toEqual([11, 12]);

    component.filterForm.controls.schoolGroupId.setValue(12);
    component.onGroupFilterChange();
    expect(component.filteredStudents().map(s => s.id)).toEqual([102]);

    component.filterForm.controls.academicCycleId.setValue(25);
    component.onCycleFilterChange();
    expect(component.filterForm.controls.schoolGroupId.value).toBe(0);
    expect(component.schoolGroupOptions().map(g => g.id)).toEqual([9]);
    expect(component.filteredStudents().map(s => s.id)).toEqual([103]);
  });

  it('filters student status without changing bulk download totals', () => {
    component.students.set(sampleStudents);
    expect(component.activeStudentCount()).toBe(2);

    component.filterForm.controls.active.setValue('inactive');
    component.onActiveFilterChange();
    expect(component.filteredStudents().map(s => s.id)).toEqual([103]);
    expect(component.activeStudentCount()).toBe(2);

    component.filterForm.controls.active.setValue('active');
    component.onActiveFilterChange();
    expect(component.filteredStudents().map(s => s.id)).toEqual([101, 102]);
  });

  it('clears all filters and the previous selection when excluded', () => {
    component.students.set(sampleStudents);
    component.credentialForm.controls.studentId.setValue(101);
    component.selectedStudent.set(sampleStudents[0]);

    component.filterForm.controls.search.setValue('Ana');
    component.onSearchInput();

    expect(component.credentialForm.controls.studentId.value).toBeNull();
    expect(component.selectedStudent()).toBeNull();
    expect(component.filteredStudents().map(s => s.id)).toEqual([102]);

    component.filterForm.controls.active.setValue('active');
    component.onActiveFilterChange();

    component.clearFilters();
    expect(component.hasFilters()).toBe(false);
    expect(component.filterForm.controls.search.value).toBe('');
    expect(component.filterForm.controls.academicCycleId.value).toBe(0);
    expect(component.filterForm.controls.schoolGroupId.value).toBe(0);
    expect(component.filterForm.controls.active.value).toBe('all');
    expect(component.filteredStudents()).toHaveLength(3);
  });
});