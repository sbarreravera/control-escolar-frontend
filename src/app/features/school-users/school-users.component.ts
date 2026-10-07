import { DatePipe } from '@angular/common';
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
  finalize,
  forkJoin
} from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  CreateSchoolUserRequest,
  SchoolModuleDefinition,
  SchoolUser,
  UpdateSchoolUserRequest
} from './school-user.models';
import { SchoolUserService } from './school-user.service';

type UserTab = 'ACTIVE' | 'ARCHIVED';

@Component({
  selector: 'app-school-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe
  ],
  templateUrl: './school-users.component.html'
})
export class SchoolUsersComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly schoolUserService =
    inject(SchoolUserService);

  readonly currentUser = this.authService.currentUser;
  readonly users = signal<SchoolUser[]>([]);
  readonly modules = signal<SchoolModuleDefinition[]>([]);
  readonly selectedModuleKeys =
    signal<Set<string>>(new Set());

  readonly activeTab = signal<UserTab>('ACTIVE');
  readonly searchTerm = signal('');
  readonly loading = signal(true);
  readonly loadingUsers = signal(false);
  readonly submitting = signal(false);
  readonly busyUserId = signal<number | null>(null);
  readonly editingUserId = signal<number | null>(null);
  readonly archiveCandidate = signal<SchoolUser | null>(null);
  readonly restoreCandidate = signal<SchoolUser | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly editing = computed(
    () => this.editingUserId() !== null
  );

  readonly archivedView = computed(
    () => this.activeTab() === 'ARCHIVED'
  );

  readonly schoolName = computed(
    () => this.currentUser()?.schoolName ?? 'Escuela'
  );

  readonly userForm = this.formBuilder.nonNullable.group({
    fullName: [
      '',
      [
        Validators.required,
        Validators.maxLength(150)
      ]
    ],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(150)
      ]
    ],
    password: [
      '',
      [
        Validators.maxLength(72)
      ]
    ],
    active: [
      true
    ]
  });

  readonly restoreForm = this.formBuilder.nonNullable.group({
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(72)
      ]
    ],
    confirmPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(72)
      ]
    ]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const schoolId = this.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.loading.set(false);
      this.errorMessage.set(
        'Selecciona una escuela antes de administrar usuarios.'
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      modules: this.schoolUserService.findModules(),
      users: this.schoolUserService.findAll(
        schoolId,
        false,
        ''
      )
    })
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: result => {
          this.modules.set(
            [...result.modules].sort(
              (left, right) =>
                left.order - right.order ||
                left.name.localeCompare(right.name)
            )
          );
          this.users.set(result.users);
          this.resetForCreate();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  setTab(tab: UserTab): void {
    if (this.activeTab() === tab) {
      return;
    }

    this.activeTab.set(tab);
    this.searchTerm.set('');
    this.archiveCandidate.set(null);
    this.restoreCandidate.set(null);
    this.resetForCreate();
    this.loadUsers();
  }

  searchUsers(): void {
    this.loadUsers();
  }

  clearSearch(): void {
    if (!this.searchTerm()) {
      return;
    }

    this.searchTerm.set('');
    this.loadUsers();
  }

  toggleModule(
    moduleKey: string,
    checked: boolean
  ): void {
    this.selectedModuleKeys.update(current => {
      const next = new Set(current);

      if (checked) {
        next.add(moduleKey);
      } else {
        next.delete(moduleKey);
      }

      return next;
    });
  }

  hasModule(moduleKey: string): boolean {
    return this.selectedModuleKeys().has(moduleKey);
  }

  editUser(user: SchoolUser): void {
    if (!user.editable || this.archivedView()) {
      return;
    }

    this.editingUserId.set(user.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.userForm.reset({
      fullName: user.fullName,
      email: user.email,
      password: '',
      active: user.active
    });

    this.selectedModuleKeys.set(
      new Set(user.moduleKeys)
    );
  }

  cancelEdit(): void {
    this.resetForCreate();
  }

  saveUser(): void {
    if (this.archivedView()) {
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const schoolId = this.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.errorMessage.set(
        'No fue posible identificar la escuela.'
      );
      return;
    }

    const formValue = this.userForm.getRawValue();
    const password = formValue.password;

    if (!this.editing() && password.length < 8) {
      this.userForm.controls.password.setErrors({
        minlength: true
      });
      this.userForm.controls.password.markAsTouched();
      return;
    }

    if (
      this.editing() &&
      password.length > 0 &&
      password.length < 8
    ) {
      this.userForm.controls.password.setErrors({
        minlength: true
      });
      this.userForm.controls.password.markAsTouched();
      return;
    }

    const moduleKeys = [
      ...this.selectedModuleKeys()
    ].sort();

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const editingUserId = this.editingUserId();

    const request$ = editingUserId === null
      ? this.schoolUserService.create({
          schoolId,
          fullName: formValue.fullName.trim(),
          email: formValue.email.trim().toLowerCase(),
          password,
          moduleKeys
        } satisfies CreateSchoolUserRequest)
      : this.schoolUserService.update(
          editingUserId,
          {
            fullName: formValue.fullName.trim(),
            email: formValue.email.trim().toLowerCase(),
            active: formValue.active,
            password: password || null,
            moduleKeys
          } satisfies UpdateSchoolUserRequest
        );

    request$
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: savedUser => {
          this.successMessage.set(
            editingUserId === null
              ? `El usuario ${savedUser.fullName} fue creado correctamente.`
              : `El usuario ${savedUser.fullName} fue actualizado correctamente.`
          );

          this.resetForCreate(false);
          this.loadUsers(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  requestArchive(user: SchoolUser): void {
    if (!user.archivable) {
      return;
    }

    this.archiveCandidate.set(user);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  cancelArchive(): void {
    this.archiveCandidate.set(null);
  }

  confirmArchive(): void {
    const user = this.archiveCandidate();

    if (!user) {
      return;
    }

    this.busyUserId.set(user.id);
    this.errorMessage.set(null);

    this.schoolUserService.archive(user.id)
      .pipe(
        finalize(() => this.busyUserId.set(null))
      )
      .subscribe({
        next: archivedUser => {
          this.archiveCandidate.set(null);

          if (this.editingUserId() === archivedUser.id) {
            this.resetForCreate(false);
          }

          this.successMessage.set(
            `${archivedUser.fullName} fue eliminado de los usuarios activos. Su historial se conserva por auditoría.`
          );

          this.loadUsers(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  requestRestore(user: SchoolUser): void {
    if (!user.restorable) {
      return;
    }

    this.restoreCandidate.set(user);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.restoreForm.reset({
      password: '',
      confirmPassword: ''
    });
  }

  cancelRestore(): void {
    this.restoreCandidate.set(null);
    this.restoreForm.reset({
      password: '',
      confirmPassword: ''
    });
  }

  confirmRestore(): void {
    const user = this.restoreCandidate();

    if (!user) {
      return;
    }

    if (this.restoreForm.invalid) {
      this.restoreForm.markAllAsTouched();
      return;
    }

    const {
      password,
      confirmPassword
    } = this.restoreForm.getRawValue();

    if (password !== confirmPassword) {
      this.restoreForm.controls.confirmPassword.setErrors({
        mismatch: true
      });
      this.restoreForm.controls.confirmPassword.markAsTouched();
      return;
    }

    this.busyUserId.set(user.id);
    this.errorMessage.set(null);

    this.schoolUserService.restore(
      user.id,
      {
        password
      }
    )
      .pipe(
        finalize(() => this.busyUserId.set(null))
      )
      .subscribe({
        next: restoredUser => {
          this.cancelRestore();

          this.successMessage.set(
            `${restoredUser.fullName} fue restaurado. Ya puede iniciar sesión con la nueva contraseña temporal.`
          );

          this.loadUsers(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  roleLabel(user: SchoolUser): string {
    return user.role === 'ADMIN'
      ? 'Administrador principal'
      : 'Usuario de escuela';
  }

  moduleName(moduleKey: string): string {
    return this.modules().find(
      module => module.key === moduleKey
    )?.name ?? moduleKey;
  }

  private loadUsers(clearMessages = true): void {
    const schoolId = this.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      return;
    }

    this.loadingUsers.set(true);

    if (clearMessages) {
      this.errorMessage.set(null);
      this.successMessage.set(null);
    }

    this.schoolUserService.findAll(
      schoolId,
      this.archivedView(),
      this.searchTerm()
    )
      .pipe(
        finalize(() => this.loadingUsers.set(false))
      )
      .subscribe({
        next: users => {
          this.users.set(users);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private resetForCreate(
    clearMessages = true
  ): void {
    this.editingUserId.set(null);

    this.userForm.reset({
      fullName: '',
      email: '',
      password: '',
      active: true
    });

    this.selectedModuleKeys.set(
      new Set(
        this.modules()
          .filter(module => module.defaultGranted)
          .map(module => module.key)
      )
    );

    if (clearMessages) {
      this.errorMessage.set(null);
      this.successMessage.set(null);
    }
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'La operación no puede realizarse en el estado actual del usuario.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para realizar esta operación.';
    }

    if (error.status === 400) {
      return 'Revisa los datos capturados antes de continuar.';
    }

    if (error.status === 0) {
      return 'No fue posible comunicarse con el servidor.';
    }

    return 'No fue posible completar la operación. Intenta nuevamente.';
  }
}
