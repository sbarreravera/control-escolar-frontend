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
      role: 'ADMIN'
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});