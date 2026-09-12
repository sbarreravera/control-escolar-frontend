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
  GuardianDeletionImpact,
  StudentGuardian,
  UpdateGuardianRequest
} from './guardian.models';
import {
  GuardianService
} from './guardian.service';
import {
  GuardianNotificationInvitationComponent
} from './guardian-notification-invitation.component';

@Component({
  selector: 'app-guardians',
  templateUrl: './guardians.component.html',
  imports: [
    ReactiveFormsModule,
    GuardianNotificationInvitationComponent,
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
  readonly editingGuardianId = signal<number | null>(null);
  readonly submittingRelationship = signal(false);
  readonly removingGuardianId =
    signal<number | null>(null);
  readonly checkingDeletionGuardianId =
    signal<number | null>(null);
  readonly deletingGuardianId =
    signal<number | null>(null);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage =
    signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly canDeleteGuardians = computed(
    () => this.authService.currentUser()?.role === 'ADMIN'
  );

  readonly guardianForm =
    this.formBuilder.nonNullable.group({
      externalReference: [
        '',
        [
          Validators.maxLength(50)
        ]
      ],
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

    const editableData: UpdateGuardianRequest = {
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

    const editingGuardianId =
      this.editingGuardianId();

    const request: CreateGuardianRequest = {
      schoolId,
      externalReference:
        this.normalizeOptionalText(
          formValue.externalReference
        )?.toUpperCase() ?? null,
      ...editableData
    };

    const operation = editingGuardianId === null
      ? this.guardianService.create(request)
      : this.guardianService.update(
          editingGuardianId,
          editableData
        );

    operation
      .pipe(
        finalize(
          () => this.submittingGuardian.set(false)
        )
      )
      .subscribe({
        next: guardian => {
          this.guardians.update(current =>
            editingGuardianId === null
              ? [...current, guardian]
              : current.map(item =>
                  item.id === guardian.id
                    ? guardian
                    : item
                )
          );

          this.resetGuardianForm();

          this.successMessage.set(
            editingGuardianId === null
              ? `El tutor ${guardian.fullName} fue registrado correctamente.`
              : `Los datos de ${guardian.fullName} fueron actualizados correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          if (
            editingGuardianId === null &&
            error.status === 409
          ) {
            this.errorMessage.set(
              'Ya existe un tutor con esa clave en la escuela.'
            );
            return;
          }

          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  startEditing(guardian: Guardian): void {
    this.editingGuardianId.set(guardian.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.guardianForm.reset({
      externalReference:
        guardian.externalReference ?? '',
      fullName: guardian.fullName,
      phone: guardian.phone ?? '',
      email: guardian.email ?? ''
    });
  }

  cancelEditing(): void {
    this.resetGuardianForm();
  }

  requestGuardianDeletion(guardian: Guardian): void {
    if (
      !this.canDeleteGuardians() ||
      this.checkingDeletionGuardianId() !== null ||
      this.deletingGuardianId() !== null
    ) {
      return;
    }

    this.checkingDeletionGuardianId.set(guardian.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.guardianService
      .deletionImpact(guardian.id)
      .pipe(
        finalize(() => this.checkingDeletionGuardianId.set(null))
      )
      .subscribe({
        next: impact => {
          const confirmed = window.confirm(
            this.buildGuardianDeletionConfirmation(impact)
          );

          if (confirmed) {
            this.deleteGuardian(guardian);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private deleteGuardian(guardian: Guardian): void {
    this.deletingGuardianId.set(guardian.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.guardianService
      .delete(guardian.id)
      .pipe(
        finalize(() => this.deletingGuardianId.set(null))
      )
      .subscribe({
        next: () => {
          this.guardians.update(current =>
            current.filter(item => item.id !== guardian.id)
          );
          this.studentGuardians.update(current =>
            current.filter(item => item.guardianId !== guardian.id)
          );

          if (this.editingGuardianId() === guardian.id) {
            this.resetGuardianForm();
          }

          if (
            this.relationshipForm.controls.guardianId.value === guardian.id
          ) {
            this.relationshipForm.controls.guardianId.setValue(null);
          }

          this.successMessage.set(
            `El tutor ${guardian.fullName} fue eliminado definitivamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private buildGuardianDeletionConfirmation(
    impact: GuardianDeletionImpact
  ): string {
    if (impact.students.length === 0) {
      const activeDevices = impact.activeNotificationDeviceCount > 0
        ? ` Tiene ${impact.activeNotificationDeviceCount} dispositivo(s) con notificaciones activas, que también serán eliminados.`
        : '';

      return `¿Eliminar definitivamente a ${impact.guardianName}?${activeDevices}\n\nTambién se eliminarán su acceso al portal, sesiones, invitaciones y datos de notificaciones asociados. Esta acción no se puede deshacer.`;
    }

    const studentLines = impact.students
      .map(student =>
        `• ${student.studentName} — matrícula ${student.enrollmentNumber}`
      )
      .join('\n');

    const deviceLine = impact.activeNotificationDeviceCount > 0
      ? `\n- ${impact.activeNotificationDeviceCount} dispositivo(s) con notificaciones activas.`
      : '';

    const historyCount =
      impact.notificationLogCount + impact.communicationRecipientCount;
    const historyLine = historyCount > 0
      ? '\n- Su historial de entrega/recepción de notificaciones y avisos asociado.'
      : '';

    return `ATENCIÓN: ${impact.guardianName} está asignado a:\n${studentLines}\n\nAl eliminar este tutor se eliminarán:\n- Todas estas asignaciones alumno-tutor.\n- Su cuenta de acceso al portal, sesiones e invitaciones.\n- Sus dispositivos y configuración de notificaciones.${deviceLine}${historyLine}\n\nLos alumnos y su historial de entradas/salidas NO se eliminarán.\n\nEsta acción no se puede deshacer. ¿Deseas eliminar al tutor definitivamente?`;
  }

  private resetGuardianForm(): void {
    this.editingGuardianId.set(null);
    this.guardianForm.reset({
      externalReference: '',
      fullName: '',
      phone: '',
      email: ''
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
