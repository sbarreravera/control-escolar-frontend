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
import { AuthService } from '../../core/auth/auth.service';
import { StudentImportComponent } from './student-import.component';

describe('StudentImportComponent', () => {
  let component: StudentImportComponent;
  let fixture: ComponentFixture<StudentImportComponent>;
  let httpTestingController: HttpTestingController;

  const authenticatedUser = signal<AuthenticatedUser | null>({
    id: 2,
    schoolId: 10,
    schoolName: 'Colegio San Felipe de Jesús',
    fullName: 'Laura Cruz Reyes',
    email: 'prefectura@colegio.test',
    role: 'ADMIN'
  });

  const authServiceMock = {
    currentUser: authenticatedUser.asReadonly()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StudentImportComponent
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
    fixture = TestBed.createComponent(StudentImportComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();

    const cyclesRequest = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/academic-cycles' &&
        request.params.get('schoolId') === '10'
    );

    cyclesRequest.flush([
      {
        id: 20,
        schoolId: 10,
        schoolName: 'Colegio San Felipe de Jesús',
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

  it('should create and select the active cycle', () => {
    expect(component).toBeTruthy();
    expect(component.academicCycleId.value).toBe(20);
  });

  it('should validate and import the selected workbook', () => {
    const file = new File(
      ['xlsx-content'],
      'alumnos.xlsx',
      {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    );

    const input = fixture.nativeElement.querySelector(
      '#studentImportFile'
    ) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: {
        0: file,
        length: 1,
        item: () => file
      }
    });
    input.dispatchEvent(new Event('change'));

    component.validateFile();

    const validationRequest = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/student-imports/validate' &&
        request.params.get('academicCycleId') === '20'
    );

    expect(validationRequest.request.method).toBe('POST');
    expect(validationRequest.request.body instanceof FormData).toBe(true);

    validationRequest.flush({
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      canImport: true,
      errors: []
    });

    expect(component.canImport()).toBe(true);

    component.importStudents();

    const importRequest = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/student-imports' &&
        request.params.get('academicCycleId') === '20'
    );

    expect(importRequest.request.method).toBe('POST');

    importRequest.flush({
      importedRows: 2,
      validation: {
        totalRows: 2,
        validRows: 2,
        invalidRows: 0,
        canImport: true,
        errors: []
      }
    });

    expect(component.successMessage()).toContain(
      '2 alumnos fueron registrados'
    );
    expect(component.selectedFile()).toBeNull();
  });
});
