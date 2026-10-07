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

@Component({
  selector: 'app-school-users',
  standalone: true,
  imports: [
    ReactiveFormsModule
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

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly editingUserId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly editing = computed(
    () => this.editingUserId() !== null
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
      users: this.schoolUserService.findAll(schoolId)
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
    if (!user.editable) {
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
          this.users.update(current => {
            const withoutSaved = current.filter(
              user => user.id !== savedUser.id
            );

            return [
              ...withoutSaved,
              savedUser
            ].sort((left, right) => {
              if (left.role !== right.role) {
                return left.role.localeCompare(right.role);
              }

              return left.fullName.localeCompare(
                right.fullName
              );
            });
          });

          this.successMessage.set(
            editingUserId === null
              ? `El usuario ${savedUser.fullName} fue creado correctamente.`
              : `El usuario ${savedUser.fullName} fue actualizado correctamente.`
          );

          this.resetForCreate(false);
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
      return 'Ya existe un usuario con ese correo electrónico.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar estos usuarios.';
    }

    if (error.status === 400) {
      return 'Revisa los datos y los módulos seleccionados.';
    }

    if (error.status === 0) {
      return 'No fue posible comunicarse con el servidor.';
    }

    return 'No fue posible guardar el usuario. Intenta nuevamente.';
  }
}
