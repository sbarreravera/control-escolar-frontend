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
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  CreateStudentRequest,
  Student
} from './student.models';
import { StudentService } from './student.service';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
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
export class StudentsComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly studentService = inject(StudentService);

  readonly students = signal<Student[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly studentForm = this.formBuilder.nonNullable.group({
    enrollmentNumber: [
      '',
      [
        Validators.required,
        Validators.maxLength(50)
      ]
    ],
    firstName: [
      '',
      [
        Validators.required,
        Validators.maxLength(100)
      ]
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.maxLength(150)
      ]
    ],
    gradeName: [
      '',
      [
        Validators.maxLength(50)
      ]
    ],
    groupName: [
      '',
      [
        Validators.maxLength(50)
      ]
    ]
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
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

    this.studentService
      .findAllBySchool(schoolId)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: students => {
          this.students.set(students);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  createStudent(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
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

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue =
      this.studentForm.getRawValue();

    const request: CreateStudentRequest = {
      schoolId,
      enrollmentNumber:
        formValue.enrollmentNumber.trim(),
      firstName:
        formValue.firstName.trim(),
      lastName:
        formValue.lastName.trim(),
      gradeName:
        this.normalizeOptionalText(
          formValue.gradeName
        ),
      groupName:
        this.normalizeOptionalText(
          formValue.groupName
        )
    };

    this.studentService
      .create(request)
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: student => {
          this.students.update(current => [
            ...current,
            student
          ]);

          this.studentForm.reset({
            enrollmentNumber: '',
            firstName: '',
            lastName: '',
            gradeName: '',
            groupName: ''
          });

          this.successMessage.set(
            `El alumno ${student.firstName} ${student.lastName} fue registrado correctamente.`
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
      return 'La matrícula ya está registrada en esta escuela.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar los alumnos de esta escuela.';
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
  }
}