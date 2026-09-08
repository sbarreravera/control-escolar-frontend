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
  AcademicCycle
} from '../academic-cycles/academic-cycle.models';
import {
  AcademicCycleService
} from '../academic-cycles/academic-cycle.service';
import {
  SchoolGroup
} from '../school-groups/school-group.models';
import {
  SchoolGroupService
} from '../school-groups/school-group.service';
import {
  CreateStudentRequest,
  Student,
  UpdateStudentRequest
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
  private readonly academicCycleService =
    inject(AcademicCycleService);
  private readonly schoolGroupService =
    inject(SchoolGroupService);

  readonly students = signal<Student[]>([]);
  readonly academicCycles = signal<AcademicCycle[]>([]);
  readonly schoolGroups = signal<SchoolGroup[]>([]);

  readonly loading = signal(true);
  readonly loadingCycles = signal(true);
  readonly loadingGroups = signal(false);
  readonly submitting = signal(false);
  readonly editingStudentId = signal<number | null>(null);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly isEditing = computed(
    () => this.editingStudentId() !== null
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
    academicCycleId: [
      0,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    schoolGroupId: [
      0,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],

    // Se conservan temporalmente hasta sustituir
    // los campos anteriores en el template.
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
    this.loadAcademicCycles();
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

  loadAcademicCycles(): void {
    const schoolId =
      this.authService.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.loadingCycles.set(false);
      return;
    }

    this.loadingCycles.set(true);

    this.academicCycleService
      .findAllBySchool(schoolId)
      .pipe(
        finalize(() => this.loadingCycles.set(false))
      )
      .subscribe({
        next: academicCycles => {
          const activeCycles =
            academicCycles.filter(cycle => cycle.active);

          this.academicCycles.set(activeCycles);

          if (activeCycles.length === 0) {
            this.schoolGroups.set([]);
            return;
          }

          if (this.isEditing()) {
            return;
          }

          const selectedCycle = activeCycles[0];

          this.studentForm.controls
            .academicCycleId
            .setValue(selectedCycle.id);

          this.loadSchoolGroups(selectedCycle.id);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  onAcademicCycleChange(): void {
    const academicCycleId =
      this.studentForm.controls
        .academicCycleId.value;

    this.studentForm.controls
      .schoolGroupId
      .setValue(0);

    this.schoolGroups.set([]);

    if (academicCycleId <= 0) {
      return;
    }

    this.loadSchoolGroups(academicCycleId);
  }

  loadSchoolGroups(
    academicCycleId: number
  ): void {
    this.loadingGroups.set(true);

    this.schoolGroupService
      .findAllByAcademicCycle(academicCycleId)
      .pipe(
        finalize(() => this.loadingGroups.set(false))
      )
      .subscribe({
        next: schoolGroups => {
          this.schoolGroups.set(
            schoolGroups.filter(group => group.active)
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  saveStudent(): void {
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

    const editingStudentId =
      this.editingStudentId();

    const studentRequest = editingStudentId === null
      ? this.studentService.create({
          schoolId,
          enrollmentNumber:
            formValue.enrollmentNumber.trim(),
          firstName:
            formValue.firstName.trim(),
          lastName:
            formValue.lastName.trim(),
          gradeName: null,
          groupName: null,
          schoolGroupId: formValue.schoolGroupId
        } satisfies CreateStudentRequest)
      : this.studentService.update(
          editingStudentId,
          {
            enrollmentNumber:
              formValue.enrollmentNumber.trim(),
            firstName:
              formValue.firstName.trim(),
            lastName:
              formValue.lastName.trim(),
            schoolGroupId:
              formValue.schoolGroupId
          } satisfies UpdateStudentRequest
        );

    studentRequest
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: student => {
          this.students.update(current => {
            const studentExists = current.some(
              currentStudent => currentStudent.id === student.id
            );

            if (!studentExists) {
              return [...current, student];
            }

            return current.map(currentStudent =>
              currentStudent.id === student.id
                ? student
                : currentStudent
            );
          });

          const wasEditing = editingStudentId !== null;
          this.editingStudentId.set(null);

          // Conservamos ciclo y grupo para facilitar
          // la captura consecutiva de alumnos del mismo salón.
          this.studentForm.reset({
            enrollmentNumber: '',
            firstName: '',
            lastName: '',
            academicCycleId:
              formValue.academicCycleId,
            schoolGroupId:
              formValue.schoolGroupId,
            gradeName: '',
            groupName: ''
          });

          this.successMessage.set(
            wasEditing
              ? `El alumno ${student.firstName} ${student.lastName} fue actualizado correctamente.`
              : `El alumno ${student.firstName} ${student.lastName} fue registrado correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  startEditing(student: Student): void {
    this.editingStudentId.set(student.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const academicCycleId =
      student.academicCycleId ?? 0;
    const schoolGroupId =
      student.schoolGroupId ?? 0;

    this.studentForm.reset({
      enrollmentNumber: student.enrollmentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      academicCycleId,
      schoolGroupId,
      gradeName: '',
      groupName: ''
    });

    this.schoolGroups.set([]);

    if (academicCycleId > 0) {
      this.loadSchoolGroups(academicCycleId);
    }
  }

  cancelEditing(): void {
    this.editingStudentId.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const academicCycleId =
      this.academicCycles()[0]?.id ?? 0;

    this.studentForm.reset({
      enrollmentNumber: '',
      firstName: '',
      lastName: '',
      academicCycleId,
      schoolGroupId: 0,
      gradeName: '',
      groupName: ''
    });

    this.schoolGroups.set([]);

    if (academicCycleId > 0) {
      this.loadSchoolGroups(academicCycleId);
    }
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'La matrícula ya está registrada o el grupo seleccionado ya no está activo.';
    }

    if (error.status === 404) {
      return 'No fue posible encontrar el ciclo o grupo seleccionado.';
    }

    if (error.status === 400) {
      return 'El grupo seleccionado no corresponde a esta escuela.';
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
