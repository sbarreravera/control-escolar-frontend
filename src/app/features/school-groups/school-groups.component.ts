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
  CreateSchoolGroupRequest,
  SchoolGroup
} from './school-group.models';
import {
  SchoolGroupService
} from './school-group.service';

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
  private readonly academicCycleService =
    inject(AcademicCycleService);
  private readonly schoolGroupService =
    inject(SchoolGroupService);

  readonly academicCycles = signal<AcademicCycle[]>([]);
  readonly schoolGroups = signal<SchoolGroup[]>([]);

  readonly loadingCycles = signal(true);
  readonly loadingGroups = signal(false);
  readonly submitting = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly schoolGroupForm =
    this.formBuilder.nonNullable.group({
      academicCycleId: [
        0,
        [
          Validators.required,
          Validators.min(1)
        ]
      ],
      gradeName: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],
      groupName: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
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
      this.loadingCycles.set(false);
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    this.loadingCycles.set(true);
    this.errorMessage.set(null);

    this.academicCycleService
      .findAllBySchool(schoolId)
      .pipe(
        finalize(() => this.loadingCycles.set(false))
      )
      .subscribe({
        next: academicCycles => {
          this.academicCycles.set(academicCycles);

          if (academicCycles.length === 0) {
            this.schoolGroups.set([]);
            return;
          }

          const selectedCycle =
            academicCycles.find(cycle => cycle.active) ??
            academicCycles[0];

          this.schoolGroupForm.controls
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
      this.schoolGroupForm.controls
        .academicCycleId.value;

    this.successMessage.set(null);

    if (academicCycleId <= 0) {
      this.schoolGroups.set([]);
      return;
    }

    this.loadSchoolGroups(academicCycleId);
  }

  loadSchoolGroups(
    academicCycleId: number
  ): void {
    this.loadingGroups.set(true);
    this.errorMessage.set(null);

    this.schoolGroupService
      .findAllByAcademicCycle(academicCycleId)
      .pipe(
        finalize(() => this.loadingGroups.set(false))
      )
      .subscribe({
        next: schoolGroups => {
          this.schoolGroups.set(schoolGroups);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  createSchoolGroup(): void {
    if (this.schoolGroupForm.invalid) {
      this.schoolGroupForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue =
      this.schoolGroupForm.getRawValue();

    const request: CreateSchoolGroupRequest = {
      academicCycleId: formValue.academicCycleId,
      gradeName: formValue.gradeName.trim(),
      groupName: formValue.groupName.trim()
    };

    this.schoolGroupService
      .create(request)
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: schoolGroup => {
          this.schoolGroups.update(current =>
            [
              ...current,
              schoolGroup
            ].sort(
              (left, right) => {
                const gradeComparison =
                  left.gradeName.localeCompare(
                    right.gradeName,
                    'es',
                    {
                      numeric: true
                    }
                  );

                if (gradeComparison !== 0) {
                  return gradeComparison;
                }

                return left.groupName.localeCompare(
                  right.groupName,
                  'es',
                  {
                    numeric: true
                  }
                );
              }
            )
          );

          this.schoolGroupForm.reset({
            academicCycleId:
              formValue.academicCycleId,
            gradeName: '',
            groupName: ''
          });

          this.successMessage.set(
            `El grupo ${schoolGroup.gradeName} ${schoolGroup.groupName} fue registrado correctamente.`
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
      return 'Ese grado y grupo ya están registrados en el ciclo escolar seleccionado.';
    }

    if (error.status === 400) {
      return 'Revisa los datos del grado y grupo.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar los grupos de esta escuela.';
    }

    if (error.status === 404) {
      return 'No fue posible encontrar el ciclo escolar seleccionado.';
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
  }
}
