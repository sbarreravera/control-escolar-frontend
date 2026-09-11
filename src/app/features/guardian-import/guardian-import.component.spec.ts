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
import { GuardianImportComponent } from './guardian-import.component';

describe('GuardianImportComponent', () => {
  let component: GuardianImportComponent;
  let fixture: ComponentFixture<GuardianImportComponent>;
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
        GuardianImportComponent
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
    fixture = TestBed.createComponent(GuardianImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create for the authenticated school', () => {
    expect(component).toBeTruthy();
    expect(component.schoolName()).toBe(
      'Colegio San Felipe de Jesús'
    );
  });

  it('should validate and import the selected workbook', () => {
    const file = new File(
      ['xlsx-content'],
      'tutores.xlsx',
      {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    );
    const input = fixture.nativeElement.querySelector(
      '#guardianImportFile'
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
        request.url === '/api/v1/guardian-imports/validate' &&
        request.params.get('schoolId') === '10'
    );
    expect(validationRequest.request.method).toBe('POST');
    expect(validationRequest.request.body instanceof FormData).toBe(true);
    validationRequest.flush({
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      guardiansToCreate: 1,
      guardiansToReuse: 1,
      relationshipsToCreate: 2,
      canImport: true,
      errors: []
    });

    expect(component.canImport()).toBe(true);
    component.importGuardians();

    const importRequest = httpTestingController.expectOne(
      request =>
        request.url === '/api/v1/guardian-imports' &&
        request.params.get('schoolId') === '10'
    );
    expect(importRequest.request.method).toBe('POST');
    importRequest.flush({
      guardiansCreated: 1,
      guardiansReused: 1,
      relationshipsCreated: 2,
      validation: {
        totalRows: 2,
        validRows: 2,
        invalidRows: 0,
        guardiansToCreate: 1,
        guardiansToReuse: 1,
        relationshipsToCreate: 2,
        canImport: true,
        errors: []
      }
    });

    expect(component.successMessage()).toContain(
      'Tutores creados: 1'
    );
    expect(component.selectedFile()).toBeNull();
  });
});
