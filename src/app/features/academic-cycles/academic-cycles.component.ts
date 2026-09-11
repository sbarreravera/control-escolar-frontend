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
  AcademicCycle,
  CreateAcademicCycleRequest,
  UpdateAcademicCycleRequest
} from './academic-cycle.models';
import { AcademicCycleService } from './academic-cycle.service';

@Component({
  selector: 'app-academic-cycles',
  templateUrl: './academic-cycles.component.html',
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
export class AcademicCyclesComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly academicCycleService =
    inject(AcademicCycleService);

  readonly academicCycles = signal<AcademicCycle[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly deletingCycleId = signal<number | null>(null);
  readonly editingCycleId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly editing = computed(
    () => this.editingCycleId() !== null
  );

  readonly academicCycleForm =
    this.formBuilder.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],
      startDate: [
        '',
        [
          Validators.required
        ]
      ],
      endDate: [
        '',
        [
          Validators.required
        ]
      ]
    });

  ngOnInit(): void {
    this.loadAcademicCycles();
  }

  loadAcademicCycles(): void {
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

    this.academicCycleService
      .findAllBySchool(schoolId)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: academicCycles => {
          this.academicCycles.set(academicCycles);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  saveAcademicCycle(): void {
    if (this.academicCycleForm.invalid) {
      this.academicCycleForm.markAllAsTouched();
      return;
    }

    const formValue =
      this.academicCycleForm.getRawValue();

    if (formValue.endDate < formValue.startDate) {
      this.errorMessage.set(
        'La fecha de término no puede ser anterior a la fecha de inicio.'
      );
      return;
    }

    const editingCycleId = this.editingCycleId();

    if (editingCycleId === null) {
      this.createAcademicCycle(formValue);
      return;
    }

    this.updateAcademicCycle(editingCycleId, formValue);
  }

  startEditing(academicCycle: AcademicCycle): void {
    this.editingCycleId.set(academicCycle.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.academicCycleForm.reset({
      name: academicCycle.name,
      startDate: academicCycle.startDate,
      endDate: academicCycle.endDate
    });
  }

  cancelEditing(): void {
    this.editingCycleId.set(null);
    this.resetForm();
    this.errorMessage.set(null);
  }

  deleteAcademicCycle(academicCycle: AcademicCycle): void {
    if (academicCycle.hasGroups) {
      this.errorMessage.set(
        `No se puede eliminar ${academicCycle.name} porque ya tiene grados o grupos asociados.`
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el ciclo escolar ${academicCycle.name}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    this.deletingCycleId.set(academicCycle.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.academicCycleService
      .delete(academicCycle.id)
      .pipe(
        finalize(() => this.deletingCycleId.set(null))
      )
      .subscribe({
        next: () => {
          this.academicCycles.update(current =>
            current.filter(item => item.id !== academicCycle.id)
          );

          if (this.editingCycleId() === academicCycle.id) {
            this.editingCycleId.set(null);
            this.resetForm();
          }

          this.successMessage.set(
            `El ciclo escolar ${academicCycle.name} fue eliminado correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409) {
            this.errorMessage.set(
              `No se puede eliminar ${academicCycle.name} porque ya tiene grados o grupos asociados.`
            );
            this.loadAcademicCycles();
            return;
          }

          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private createAcademicCycle(
    formValue: {
      name: string;
      startDate: string;
      endDate: string;
    }
  ): void {
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

    const request: CreateAcademicCycleRequest = {
      schoolId,
      name: formValue.name.trim(),
      startDate: formValue.startDate,
      endDate: formValue.endDate
    };

    this.academicCycleService
      .create(request)
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: academicCycle => {
          this.academicCycles.update(current =>
            this.sortCycles([
              ...current,
              academicCycle
            ])
          );

          this.resetForm();

          this.successMessage.set(
            `El ciclo escolar ${academicCycle.name} fue registrado correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private updateAcademicCycle(
    academicCycleId: number,
    formValue: {
      name: string;
      startDate: string;
      endDate: string;
    }
  ): void {
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request: UpdateAcademicCycleRequest = {
      name: formValue.name.trim(),
      startDate: formValue.startDate,
      endDate: formValue.endDate
    };

    this.academicCycleService
      .update(academicCycleId, request)
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: academicCycle => {
          this.academicCycles.update(current =>
            this.sortCycles(
              current.map(item =>
                item.id === academicCycle.id
                  ? academicCycle
                  : item
              )
            )
          );

          this.editingCycleId.set(null);
          this.resetForm();
          this.successMessage.set(
            `El ciclo escolar ${academicCycle.name} fue actualizado correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private resetForm(): void {
    this.academicCycleForm.reset({
      name: '',
      startDate: '',
      endDate: ''
    });
  }

  private sortCycles(cycles: AcademicCycle[]): AcademicCycle[] {
    return [...cycles].sort(
      (left, right) =>
        right.startDate.localeCompare(left.startDate)
    );
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'Ya existe un ciclo escolar con ese nombre.';
    }

    if (error.status === 404) {
      return 'El ciclo escolar ya no existe. Actualiza la lista e inténtalo de nuevo.';
    }

    if (error.status === 400) {
      return 'Revisa el nombre y las fechas del ciclo escolar.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar los ciclos escolares de esta escuela.';
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
  }
}
