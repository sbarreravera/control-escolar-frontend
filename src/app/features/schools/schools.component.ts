import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormControlDirective,
  FormDirective,
  RowComponent
} from '@coreui/angular';
import { finalize } from 'rxjs';
import {
  CreateSchoolRequest,
  School
} from './school.models';
import { SchoolService } from './school.service';

@Component({
  selector: 'app-schools',
  templateUrl: './schools.component.html',
  imports: [
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormDirective,
    FormControlDirective,
    ButtonDirective
  ]
})
export class SchoolsComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly schoolService = inject(SchoolService);

  readonly schools = signal<School[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolForm = this.formBuilder.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.maxLength(150)
      ]
    ],
    code: [
      '',
      [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9_-]+$/)
      ]
    ],
    adminFullName: [
      '',
      [
        Validators.required,
        Validators.maxLength(150)
      ]
    ],
    adminEmail: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(150)
      ]
    ],
    adminPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(72)
      ]
    ]
  });

  ngOnInit(): void {
    this.loadSchools();
  }

  loadSchools(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.schoolService
      .findAll()
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: schools => {
          this.schools.set(schools);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  createSchool(): void {
    if (this.schoolForm.invalid) {
      this.schoolForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.schoolForm.getRawValue();

    const request: CreateSchoolRequest = {
      name: formValue.name.trim(),
      code: formValue.code.trim().toUpperCase(),
      adminFullName:
        formValue.adminFullName.trim(),
      adminEmail:
        formValue.adminEmail.trim().toLowerCase(),
      adminPassword:
        formValue.adminPassword
    };

    this.schoolService
      .create(request)
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: school => {
          this.schools.update(current => [
            ...current,
            school
          ]);

          this.schoolForm.reset({
            name: '',
            code: '',
            adminFullName: '',
            adminEmail: '',
            adminPassword: ''
          });

          this.successMessage.set(
            `La escuela ${school.name} fue registrada correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'El código de la escuela o el correo del administrador ya están registrados.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar escuelas.';
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
  }
}