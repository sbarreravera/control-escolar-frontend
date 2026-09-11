import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  FormControlDirective,
  FormDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective
} from '@coreui/angular';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs';
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
  SortDirection,
  Student,
  StudentSort,
  UpdateStudentRequest
} from './student.models';
import { StudentService } from './student.service';

type ActiveFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormDirective,
    FormControlDirective,
    ButtonDirective,
    ModalComponent,
    ModalHeaderComponent,
    ModalTitleDirective,
    ButtonCloseDirective,
    ModalBodyComponent,
    ModalFooterComponent
  ]
})
export class StudentsComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly studentService = inject(StudentService);
  private readonly academicCycleService =
    inject(AcademicCycleService);
  private readonly schoolGroupService =
    inject(SchoolGroupService);
  private readonly searchChanges = new Subject<string>();
  private listRequestId = 0;
  private filterGroupsRequestId = 0;
  private modalGroupsRequestId = 0;

  readonly students = signal<Student[]>([]);
  readonly academicCycles = signal<AcademicCycle[]>([]);
  readonly filterSchoolGroups = signal<SchoolGroup[]>([]);
  readonly modalSchoolGroups = signal<SchoolGroup[]>([]);

  readonly loading = signal(true);
  readonly loadingCycles = signal(true);
  readonly loadingFilterGroups = signal(false);
  readonly loadingModalGroups = signal(false);
  readonly submitting = signal(false);

  readonly studentModalVisible = signal(false);
  readonly editingStudentId = signal<number | null>(null);
  readonly appliedSearch = signal('');
  readonly page = signal(0);
  readonly pageSize = signal(25);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly sort = signal<StudentSort>('studentName');
  readonly direction = signal<SortDirection>('asc');

  readonly errorMessage = signal<string | null>(null);
  readonly modalErrorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly isEditing = computed(
    () => this.editingStudentId() !== null
  );

  readonly activeAcademicCycles = computed(
    () => this.academicCycles().filter(cycle => cycle.active)
  );

  readonly rangeStart = computed(
    () => this.totalElements() === 0
      ? 0
      : this.page() * this.pageSize() + 1
  );

  readonly rangeEnd = computed(
    () => Math.min(
      (this.page() + 1) * this.pageSize(),
      this.totalElements()
    )
  );

  readonly pageNumbers = computed(() => {
    const totalPages = this.totalPages();

    if (totalPages <= 1) {
      return [];
    }

    const visiblePages = Math.min(totalPages, 5);
    let firstPage = Math.max(
      0,
      this.page() - Math.floor(visiblePages / 2)
    );

    firstPage = Math.min(
      firstPage,
      totalPages - visiblePages
    );

    return Array.from(
      { length: visiblePages },
      (_, index) => firstPage + index
    );
  });

  readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    academicCycleId: [0],
    schoolGroupId: [0],
    active: ['all' as ActiveFilter]
  });

  readonly studentForm = this.formBuilder.nonNullable.group({
    enrollmentNumber: [
      '',
      [Validators.required, Validators.maxLength(50)]
    ],
    firstName: [
      '',
      [Validators.required, Validators.maxLength(100)]
    ],
    lastName: [
      '',
      [Validators.required, Validators.maxLength(150)]
    ],
    academicCycleId: [
      0,
      [Validators.required, Validators.min(1)]
    ],
    schoolGroupId: [
      0,
      [Validators.required, Validators.min(1)]
    ],
    gradeName: ['', [Validators.maxLength(50)]],
    groupName: ['', [Validators.maxLength(50)]]
  });

  ngOnInit(): void {
    this.searchChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(search => {
        if (search === this.appliedSearch()) {
          return;
        }

        this.appliedSearch.set(search);
        this.loadStudents(0);
      });

    this.loadAcademicCycles();
    this.loadStudents(0);
  }

  loadStudents(page = this.page()): void {
    const schoolId = this.currentSchoolId();

    if (schoolId === null) {
      this.loading.set(false);
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    const requestId = ++this.listRequestId;
    const filters = this.filterForm.getRawValue();

    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);

    this.studentService
      .findPage({
        schoolId,
        page,
        size: this.pageSize(),
        search: this.appliedSearch() || undefined,
        academicCycleId: filters.academicCycleId || undefined,
        schoolGroupId: filters.schoolGroupId || undefined,
        active: this.toActiveValue(filters.active),
        sort: this.sort(),
        direction: this.direction()
      })
      .pipe(
        finalize(() => {
          if (requestId === this.listRequestId) {
            this.loading.set(false);
          }
        })
      )
      .subscribe({
        next: result => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.students.set(result.content);
          this.page.set(result.page);
          this.pageSize.set(result.size);
          this.totalElements.set(result.totalElements);
          this.totalPages.set(result.totalPages);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.students.set([]);
          this.totalElements.set(0);
          this.totalPages.set(0);
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  loadAcademicCycles(): void {
    const schoolId = this.currentSchoolId();

    if (schoolId === null) {
      this.loadingCycles.set(false);
      return;
    }

    this.loadingCycles.set(true);

    this.academicCycleService
      .findAllBySchool(schoolId)
      .pipe(finalize(() => this.loadingCycles.set(false)))
      .subscribe({
        next: cycles => this.academicCycles.set(cycles),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  onSearchInput(): void {
    this.searchChanges.next(
      this.filterForm.controls.search.value.trim()
    );
  }

  hasFilters(): boolean {
    return this.appliedSearch().length > 0 ||
      this.filterForm.controls.academicCycleId.value > 0 ||
      this.filterForm.controls.schoolGroupId.value > 0 ||
      this.filterForm.controls.active.value !== 'all';
  }

  clearSearch(): void {
    this.searchChanges.next('');
    this.filterForm.controls.search.setValue('');
    this.appliedSearch.set('');
    this.loadStudents(0);
  }

  onFilterCycleChange(): void {
    const academicCycleId =
      this.filterForm.controls.academicCycleId.value;

    this.filterForm.controls.schoolGroupId.setValue(0);
    this.filterSchoolGroups.set([]);

    if (academicCycleId > 0) {
      this.loadFilterGroups(academicCycleId);
    } else {
      this.filterGroupsRequestId++;
      this.loadingFilterGroups.set(false);
    }

    this.loadStudents(0);
  }

  onFilterGroupChange(): void {
    this.loadStudents(0);
  }

  onActiveFilterChange(): void {
    this.loadStudents(0);
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      academicCycleId: 0,
      schoolGroupId: 0,
      active: 'all'
    });
    this.searchChanges.next('');
    this.appliedSearch.set('');
    this.filterSchoolGroups.set([]);
    this.loadStudents(0);
  }

  changeSort(sort: StudentSort): void {
    if (this.sort() === sort) {
      this.direction.update(current =>
        current === 'asc' ? 'desc' : 'asc'
      );
    } else {
      this.sort.set(sort);
      this.direction.set('asc');
    }

    this.loadStudents(0);
  }

  sortIndicator(sort: StudentSort): string {
    if (this.sort() !== sort) {
      return '';
    }

    return this.direction() === 'asc' ? '↑' : '↓';
  }

  ariaSort(sort: StudentSort): 'ascending' | 'descending' | 'none' {
    if (this.sort() !== sort) {
      return 'none';
    }

    return this.direction() === 'asc'
      ? 'ascending'
      : 'descending';
  }

  goToPage(page: number): void {
    if (
      page < 0 ||
      page >= this.totalPages() ||
      page === this.page() ||
      this.loading()
    ) {
      return;
    }

    this.loadStudents(page);
  }

  onPageSizeChange(event: Event): void {
    this.pageSize.set(this.eventNumber(event));
    this.loadStudents(0);
  }

  openCreateModal(): void {
    this.editingStudentId.set(null);
    this.modalErrorMessage.set(null);
    this.successMessage.set(null);

    const filteredCycleId =
      this.filterForm.controls.academicCycleId.value;
    const academicCycleId = this.activeAcademicCycles().some(
      cycle => cycle.id === filteredCycleId
    )
      ? filteredCycleId
      : this.activeAcademicCycles()[0]?.id ?? 0;
    const filteredGroupId =
      this.filterForm.controls.schoolGroupId.value;
    const preferredGroupId = this.filterSchoolGroups().some(
      group => group.id === filteredGroupId && group.active
    )
      ? filteredGroupId
      : 0;

    this.studentForm.reset({
      enrollmentNumber: '',
      firstName: '',
      lastName: '',
      academicCycleId,
      schoolGroupId: preferredGroupId,
      gradeName: '',
      groupName: ''
    });
    this.modalSchoolGroups.set([]);

    if (academicCycleId > 0) {
      this.loadModalGroups(
        academicCycleId,
        preferredGroupId || null
      );
    }

    this.studentModalVisible.set(true);
  }

  startEditing(student: Student): void {
    this.editingStudentId.set(student.id);
    this.modalErrorMessage.set(null);
    this.successMessage.set(null);

    const academicCycleId = student.academicCycleId ?? 0;

    this.studentForm.reset({
      enrollmentNumber: student.enrollmentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      academicCycleId,
      schoolGroupId: student.schoolGroupId ?? 0,
      gradeName: '',
      groupName: ''
    });
    this.modalSchoolGroups.set([]);

    if (academicCycleId > 0) {
      this.loadModalGroups(
        academicCycleId,
        student.schoolGroupId
      );
    }

    this.studentModalVisible.set(true);
  }

  closeStudentModal(): void {
    if (this.submitting()) {
      return;
    }

    this.studentModalVisible.set(false);
    this.editingStudentId.set(null);
    this.modalErrorMessage.set(null);
  }

  onModalVisibilityChange(visible: boolean): void {
    this.studentModalVisible.set(visible);

    if (!visible && !this.submitting()) {
      this.editingStudentId.set(null);
      this.modalErrorMessage.set(null);
    }
  }

  onModalCycleChange(): void {
    const academicCycleId =
      this.studentForm.controls.academicCycleId.value;

    this.studentForm.controls.schoolGroupId.setValue(0);
    this.modalSchoolGroups.set([]);

    if (academicCycleId > 0) {
      this.loadModalGroups(academicCycleId);
    } else {
      this.modalGroupsRequestId++;
      this.loadingModalGroups.set(false);
    }
  }

  saveStudent(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    const schoolId = this.currentSchoolId();

    if (schoolId === null) {
      this.modalErrorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    this.submitting.set(true);
    this.modalErrorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.studentForm.getRawValue();
    const editingStudentId = this.editingStudentId();
    const studentRequest = editingStudentId === null
      ? this.studentService.create({
          schoolId,
          enrollmentNumber: formValue.enrollmentNumber.trim(),
          firstName: formValue.firstName.trim(),
          lastName: formValue.lastName.trim(),
          gradeName: null,
          groupName: null,
          schoolGroupId: formValue.schoolGroupId
        } satisfies CreateStudentRequest)
      : this.studentService.update(
          editingStudentId,
          {
            enrollmentNumber: formValue.enrollmentNumber.trim(),
            firstName: formValue.firstName.trim(),
            lastName: formValue.lastName.trim(),
            schoolGroupId: formValue.schoolGroupId
          } satisfies UpdateStudentRequest
        );

    studentRequest
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: student => {
          const wasEditing = editingStudentId !== null;

          this.studentModalVisible.set(false);
          this.editingStudentId.set(null);
          this.successMessage.set(
            wasEditing
              ? `El alumno ${student.firstName} ${student.lastName} fue actualizado correctamente.`
              : `El alumno ${student.firstName} ${student.lastName} fue registrado correctamente.`
          );
          this.loadStudents(wasEditing ? this.page() : 0);
        },
        error: (error: HttpErrorResponse) => {
          this.modalErrorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private loadFilterGroups(academicCycleId: number): void {
    const requestId = ++this.filterGroupsRequestId;
    this.loadingFilterGroups.set(true);

    this.schoolGroupService
      .findAllByAcademicCycle(academicCycleId)
      .pipe(
        finalize(() => {
          if (requestId === this.filterGroupsRequestId) {
            this.loadingFilterGroups.set(false);
          }
        })
      )
      .subscribe({
        next: groups => {
          if (requestId === this.filterGroupsRequestId) {
            this.filterSchoolGroups.set(groups);
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.filterGroupsRequestId) {
            return;
          }

          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private loadModalGroups(
    academicCycleId: number,
    selectedGroupId: number | null = null
  ): void {
    const requestId = ++this.modalGroupsRequestId;
    this.loadingModalGroups.set(true);

    this.schoolGroupService
      .findAllByAcademicCycle(academicCycleId)
      .pipe(
        finalize(() => {
          if (requestId === this.modalGroupsRequestId) {
            this.loadingModalGroups.set(false);
          }
        })
      )
      .subscribe({
        next: groups => {
          if (requestId !== this.modalGroupsRequestId) {
            return;
          }

          this.modalSchoolGroups.set(
            groups.filter(group =>
              group.active || group.id === selectedGroupId
            )
          );
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.modalGroupsRequestId) {
            return;
          }

          this.modalErrorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private currentSchoolId(): number | null {
    const schoolId = this.authService.currentUser()?.schoolId;
    return schoolId === null || schoolId === undefined
      ? null
      : schoolId;
  }

  private eventNumber(event: Event): number {
    return Number((event.target as HTMLSelectElement).value);
  }

  private toActiveValue(
    activeFilter: ActiveFilter
  ): boolean | undefined {
    if (activeFilter === 'all') {
      return undefined;
    }

    return activeFilter === 'active';
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'La matrícula ya está registrada o el grupo seleccionado ya no está activo.';
    }

    if (error.status === 404) {
      return 'No fue posible encontrar el ciclo, grupo o alumno seleccionado.';
    }

    if (error.status === 400) {
      return 'Revisa los datos capturados y el grupo seleccionado.';
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
