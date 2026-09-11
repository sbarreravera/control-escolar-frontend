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
import { AcademicCycle } from '../academic-cycles/academic-cycle.models';
import { AcademicCycleService } from '../academic-cycles/academic-cycle.service';
import {
  CreateSchoolGroupRequest,
  SchoolGroup,
  UpdateSchoolGroupRequest
} from './school-group.models';
import { SchoolGroupService } from './school-group.service';

@Component({
  selector: 'app-school-groups',
  templateUrl: './school-groups.component.html',
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
export class SchoolGroupsComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly academicCycleService = inject(AcademicCycleService);
  private readonly schoolGroupService = inject(SchoolGroupService);

  readonly academicCycles = signal<AcademicCycle[]>([]);
  readonly schoolGroups = signal<SchoolGroup[]>([]);
  readonly loadingCycles = signal(true);
  readonly loadingGroups = signal(false);
  readonly submitting = signal(false);
  readonly deletingGroupId = signal<number | null>(null);
  readonly editingGroup = signal<SchoolGroup | null>(null);
  readonly editing = computed(() => this.editingGroup() !== null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () => this.authService.currentUser()?.schoolName ?? 'Tu escuela'
  );

  readonly schoolGroupForm = this.formBuilder.nonNullable.group({
    academicCycleId: [0, [Validators.required, Validators.min(1)]],
    gradeName: ['', [Validators.required, Validators.maxLength(50)]],
    groupName: ['', [Validators.required, Validators.maxLength(50)]]
  });

  ngOnInit(): void {
    this.loadAcademicCycles();
  }

  loadAcademicCycles(): void {
    const schoolId = this.authService.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.loadingCycles.set(false);
      this.errorMessage.set('Tu usuario no tiene una escuela asignada.');
      return;
    }

    this.loadingCycles.set(true);
    this.errorMessage.set(null);

    this.academicCycleService
      .findAllBySchool(schoolId)
      .pipe(finalize(() => this.loadingCycles.set(false)))
      .subscribe({
        next: academicCycles => {
          this.academicCycles.set(academicCycles);

          if (academicCycles.length === 0) {
            this.schoolGroups.set([]);
            return;
          }

          const selectedCycle =
            academicCycles.find(cycle => cycle.active) ?? academicCycles[0];

          this.schoolGroupForm.controls.academicCycleId.setValue(selectedCycle.id);
          this.loadSchoolGroups(selectedCycle.id);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  onAcademicCycleChange(): void {
    if (this.editing()) {
      return;
    }

    const academicCycleId = this.schoolGroupForm.controls.academicCycleId.value;
    this.successMessage.set(null);

    if (academicCycleId <= 0) {
      this.schoolGroups.set([]);
      return;
    }

    this.loadSchoolGroups(academicCycleId);
  }

  loadSchoolGroups(academicCycleId: number): void {
    this.loadingGroups.set(true);
    this.errorMessage.set(null);

    this.schoolGroupService
      .findAllByAcademicCycle(academicCycleId)
      .pipe(finalize(() => this.loadingGroups.set(false)))
      .subscribe({
        next: schoolGroups => this.schoolGroups.set(schoolGroups),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  saveSchoolGroup(): void {
    if (this.schoolGroupForm.invalid) {
      this.schoolGroupForm.markAllAsTouched();
      return;
    }

    if (this.editing()) {
      this.updateSchoolGroup();
    } else {
      this.createSchoolGroup();
    }
  }

  startEditing(schoolGroup: SchoolGroup): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editingGroup.set(schoolGroup);

    this.schoolGroupForm.reset({
      academicCycleId: schoolGroup.academicCycleId,
      gradeName: schoolGroup.gradeName,
      groupName: schoolGroup.groupName
    });
    this.schoolGroupForm.controls.academicCycleId.disable();
  }

  cancelEditing(): void {
    const academicCycleId = this.schoolGroupForm.getRawValue().academicCycleId;
    this.editingGroup.set(null);
    this.schoolGroupForm.controls.academicCycleId.enable();
    this.resetForm(academicCycleId);
  }

  deleteSchoolGroup(schoolGroup: SchoolGroup): void {
    if (schoolGroup.hasStudents || this.deletingGroupId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar ${schoolGroup.gradeName} ${schoolGroup.groupName}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    this.deletingGroupId.set(schoolGroup.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.schoolGroupService
      .delete(schoolGroup.id)
      .pipe(finalize(() => this.deletingGroupId.set(null)))
      .subscribe({
        next: () => {
          this.schoolGroups.update(current =>
            current.filter(item => item.id !== schoolGroup.id)
          );

          if (this.editingGroup()?.id === schoolGroup.id) {
            this.cancelEditing();
          }

          this.successMessage.set(
            `El grupo ${schoolGroup.gradeName} ${schoolGroup.groupName} fue eliminado.`
          );
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409) {
            this.errorMessage.set(
              'No se puede eliminar el grupo porque tiene alumnos asignados.'
            );
            return;
          }

          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  private createSchoolGroup(): void {
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.schoolGroupForm.getRawValue();
    const request: CreateSchoolGroupRequest = {
      academicCycleId: formValue.academicCycleId,
      gradeName: formValue.gradeName.trim(),
      groupName: formValue.groupName.trim()
    };

    this.schoolGroupService
      .create(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: schoolGroup => {
          this.schoolGroups.update(current =>
            this.sortGroups([...current, schoolGroup])
          );
          this.resetForm(formValue.academicCycleId);
          this.successMessage.set(
            `El grupo ${schoolGroup.gradeName} ${schoolGroup.groupName} fue registrado correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  private updateSchoolGroup(): void {
    const schoolGroup = this.editingGroup();

    if (!schoolGroup) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.schoolGroupForm.getRawValue();
    const request: UpdateSchoolGroupRequest = {
      gradeName: formValue.gradeName.trim(),
      groupName: formValue.groupName.trim()
    };

    this.schoolGroupService
      .update(schoolGroup.id, request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: updatedGroup => {
          this.schoolGroups.update(current =>
            this.sortGroups(
              current.map(item =>
                item.id === updatedGroup.id ? updatedGroup : item
              )
            )
          );

          this.editingGroup.set(null);
          this.schoolGroupForm.controls.academicCycleId.enable();
          this.resetForm(updatedGroup.academicCycleId);
          this.successMessage.set(
            `El grupo ${updatedGroup.gradeName} ${updatedGroup.groupName} fue actualizado correctamente.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  private resetForm(academicCycleId: number): void {
    this.schoolGroupForm.reset({
      academicCycleId,
      gradeName: '',
      groupName: ''
    });
  }

  private sortGroups(groups: SchoolGroup[]): SchoolGroup[] {
    return groups.sort((left, right) => {
      const gradeComparison = left.gradeName.localeCompare(
        right.gradeName,
        'es',
        { numeric: true }
      );

      if (gradeComparison !== 0) {
        return gradeComparison;
      }

      return left.groupName.localeCompare(
        right.groupName,
        'es',
        { numeric: true }
      );
    });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'Ese grado y grupo ya están registrados en el ciclo escolar seleccionado.';
    }

    if (error.status === 400) {
      return 'Revisa los datos del grado y grupo.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar los grupos de esta escuela.';
    }

    if (error.status === 404) {
      return 'No fue posible encontrar el grado, grupo o ciclo escolar seleccionado.';
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
  }
}
