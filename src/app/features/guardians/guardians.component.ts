import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
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
import {
  finalize,
  forkJoin
} from 'rxjs';
import {
  AuthService
} from '../../core/auth/auth.service';
import {
  Student
} from '../students/student.models';
import {
  StudentService
} from '../students/student.service';
import {
  CreateGuardianRequest,
  CreateStudentGuardianRequest,
  Guardian,
  StudentGuardian
} from './guardian.models';
import {
  GuardianService
} from './guardian.service';

@Component({
  selector: 'app-guardians',
  templateUrl: './guardians.component.html',
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
export class GuardiansComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly guardianService = inject(GuardianService);
  private readonly studentService = inject(StudentService);

  readonly guardians = signal<Guardian[]>([]);
  readonly students = signal<Student[]>([]);
  readonly studentGuardians =
    signal<StudentGuardian[]>([]);

  readonly loading = signal(true);
  readonly loadingRelationships = signal(false);
  readonly submittingGuardian = signal(false);
  readonly submittingRelationship = signal(false);
  readonly removingGuardianId =
    signal<number | null>(null);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage =
    signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly guardianForm =
    this.formBuilder.nonNullable.group({
      fullName: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],
      phone: [
        '',
        [
          Validators.maxLength(30)
        ]
      ],
      email: [
        '',
        [
          Validators.email,
          Validators.maxLength(150)
        ]
      ]
    });

  readonly relationshipForm =
    this.formBuilder.group({
      studentId: [
        null as number | null,
        [
          Validators.required
        ]
      ],
      guardianId: [
        null as number | null,
        [
          Validators.required
        ]
      ],
      relationship: [
        '',
        [
          Validators.maxLength(50)
        ]
      ],
      primaryContact: [
        false
      ],
      receivesNotifications: [
        true
      ]
    });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const schoolId =
      this.authService.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.loading.set(false);
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      guardians:
        this.guardianService.findAllBySchool(
          schoolId
        ),
      students:
        this.studentService.findAllBySchool(
          schoolId
        )
    })
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: result => {
          this.guardians.set(result.guardians);
          this.students.set(result.students);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  createGuardian(): void {
    if (this.guardianForm.invalid) {
      this.guardianForm.markAllAsTouched();
      return;
    }

    const schoolId =
      this.authService.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    this.submittingGuardian.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue =
      this.guardianForm.getRawValue();

    const request: CreateGuardianRequest = {
      schoolId,
      fullName: formValue.fullName.trim(),
      phone:
        this.normalizeOptionalText(
          formValue.phone
        ),
      email:
        this.normalizeOptionalText(
          formValue.email
        )?.toLowerCase() ?? null
    };

    this.guardianService
      .create(request)
      .pipe(
        finalize(
          () => this.submittingGuardian.set(false)
        )
      )
      .subscribe({
        next: guardian => {
          this.guardians.update(current => [
            ...current,
            guardian
          ]);

          this.guardianForm.reset({
            fullName: '',
            phone: '',
            email: ''
          });

          this.successMessage.set(
            `El tutor ${guardian.fullName} fue registrado correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  loadStudentGuardians(): void {
    const studentId =
      this.relationshipForm.controls.studentId.value;

    this.studentGuardians.set([]);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (studentId === null) {
      return;
    }

    this.loadingRelationships.set(true);

    this.guardianService
      .findAllByStudent(studentId)
      .pipe(
        finalize(
          () => this.loadingRelationships.set(false)
        )
      )
      .subscribe({
        next: relationships => {
          this.studentGuardians.set(relationships);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  createRelationship(): void {
    if (this.relationshipForm.invalid) {
      this.relationshipForm.markAllAsTouched();
      return;
    }

    const formValue =
      this.relationshipForm.getRawValue();

    if (
      formValue.studentId === null ||
      formValue.guardianId === null
    ) {
      return;
    }

    this.submittingRelationship.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request: CreateStudentGuardianRequest = {
      studentId: formValue.studentId,
      guardianId: formValue.guardianId,
      relationship:
        this.normalizeOptionalText(
          formValue.relationship ?? ''
        ),
      primaryContact:
        formValue.primaryContact === true,
      receivesNotifications:
        formValue.receivesNotifications === true
    };

    this.guardianService
      .linkToStudent(request)
      .pipe(
        finalize(
          () =>
            this.submittingRelationship.set(false)
        )
      )
      .subscribe({
        next: relationship => {
          this.studentGuardians.update(current => [
            ...current,
            relationship
          ]);

          this.relationshipForm.reset({
            studentId: formValue.studentId,
            guardianId: null,
            relationship: '',
            primaryContact: false,
            receivesNotifications: true
          });

          this.successMessage.set(
            `${relationship.guardianName} fue vinculado con ${relationship.studentName}.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  removeRelationship(
    relationship: StudentGuardian
  ): void {
    const confirmed = window.confirm(
      `¿Deseas desvincular a ${relationship.guardianName} de ${relationship.studentName}?`
    );

    if (!confirmed) {
      return;
    }

    this.removingGuardianId.set(
      relationship.guardianId
    );
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.guardianService
      .unlinkFromStudent(
        relationship.studentId,
        relationship.guardianId
      )
      .pipe(
        finalize(
          () => this.removingGuardianId.set(null)
        )
      )
      .subscribe({
        next: () => {
          this.studentGuardians.update(
            current =>
              current.filter(
                item =>
                  item.guardianId !==
                  relationship.guardianId
              )
          );

          this.successMessage.set(
            'El tutor fue desvinculado correctamente.'
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private normalizeOptionalText(
    value: string
  ): string | null {
    const normalizedValue = value.trim();

    return normalizedValue.length > 0
      ? normalizedValue
      : null;
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'El tutor ya está vinculado con este alumno.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar estos datos.';
    }

    if (error.status === 404) {
      return 'No se encontró el alumno o tutor solicitado.';
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
  }
}