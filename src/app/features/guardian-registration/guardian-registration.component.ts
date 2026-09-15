import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';

import {
  GuardianDeviceEnrollmentService
} from '../guardian-device-enrollment/guardian-device-enrollment.service';
import {
  GuardianRegistrationContext,
  GuardianRegistrationSchool,
  GuardianSelfRegistrationResponse
} from './guardian-registration.models';
import {
  GuardianRegistrationService
} from './guardian-registration.service';

@Component({
  selector: 'app-guardian-registration',
  standalone: true,
  imports: [],
  templateUrl: './guardian-registration.component.html',
  styleUrl: './guardian-registration.component.scss'
})
export class GuardianRegistrationComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly registrationService = inject(GuardianRegistrationService);
  private readonly enrollmentService = inject(GuardianDeviceEnrollmentService);

  readonly token = signal(
    this.route.snapshot.queryParamMap.get('token')?.trim() ?? ''
  );
  readonly schools = signal<GuardianRegistrationSchool[]>([]);
  readonly context = signal<GuardianRegistrationContext | null>(null);
  readonly schoolCode = signal(
    this.route.snapshot.queryParamMap.get('schoolCode')?.trim() ?? ''
  );
  readonly fullName = signal('');
  readonly phone = signal('');
  readonly email = signal('');
  readonly relationship = signal('Madre');
  readonly studentEnrollments = signal<string[]>(['']);
  readonly password = signal('');
  readonly passwordConfirmation = signal('');
  readonly loadingContext = signal(true);
  readonly submitting = signal(false);
  readonly entering = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<GuardianSelfRegistrationResponse | null>(null);

  ngOnInit(): void {
    if (this.token()) {
      this.registrationService.loadContext(this.token())
        .pipe(finalize(() => this.loadingContext.set(false)))
        .subscribe({
          next: context => {
            this.context.set(context);
            this.schoolCode.set(context.schoolCode);
          },
          error: error => this.errorMessage.set(
            this.resolveErrorMessage(error)
          )
        });
      return;
    }

    this.registrationService.listSchools()
      .pipe(finalize(() => this.loadingContext.set(false)))
      .subscribe({
        next: schools => {
          this.schools.set(schools);
          if (!this.schoolCode() && schools.length === 1) {
            this.schoolCode.set(schools[0].code);
          }
        },
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  updateSchool(event: Event): void {
    this.schoolCode.set((event.target as HTMLSelectElement).value);
  }

  updateFullName(event: Event): void {
    this.fullName.set((event.target as HTMLInputElement).value);
  }

  updatePhone(event: Event): void {
    this.phone.set((event.target as HTMLInputElement).value);
  }

  updateEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  updateRelationship(event: Event): void {
    this.relationship.set((event.target as HTMLSelectElement).value);
  }

  updatePassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  updatePasswordConfirmation(event: Event): void {
    this.passwordConfirmation.set((event.target as HTMLInputElement).value);
  }

  updateEnrollment(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.studentEnrollments.update(current => current.map(
      (item, currentIndex) => currentIndex === index ? value : item
    ));
  }

  addStudent(): void {
    if (this.studentEnrollments().length >= 10) {
      return;
    }
    this.studentEnrollments.update(current => [...current, '']);
  }

  removeStudent(index: number): void {
    if (this.studentEnrollments().length === 1) {
      return;
    }
    this.studentEnrollments.update(current => current.filter(
      (_, currentIndex) => currentIndex !== index
    ));
  }

  async submit(): Promise<void> {
    const enrollments = this.studentEnrollments()
      .map(value => value.trim())
      .filter(Boolean);
    const schoolCode = this.schoolCode().trim();
    const password = this.password();

    if (!schoolCode || !this.fullName().trim() || !this.relationship()
        || enrollments.length === 0 || !password) {
      this.errorMessage.set(
        'Completa la escuela, tus datos y al menos una matrícula de alumno.'
      );
      return;
    }
    if (!this.phone().trim() && !this.email().trim()) {
      this.errorMessage.set('Captura al menos un teléfono o correo electrónico.');
      return;
    }
    if (password.length < 8) {
      this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== this.passwordConfirmation()) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const response = await firstValueFrom(this.registrationService.register({
        registrationToken: this.token() || undefined,
        schoolCode: this.token() ? undefined : schoolCode,
        fullName: this.fullName().trim(),
        phone: this.phone().trim() || undefined,
        email: this.email().trim() || undefined,
        relationship: this.relationship(),
        studentEnrollmentNumbers: enrollments,
        password
      }));
      this.result.set(response);
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async enterPortal(): Promise<void> {
    const result = this.result();
    if (!result || this.entering()) {
      return;
    }
    this.entering.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(this.enrollmentService.loginGuardian({
        schoolCode: result.schoolCode,
        username: result.username,
        password: this.password(),
        fcmToken: null,
        deviceName: this.resolveDeviceName()
      }));
      await this.router.navigateByUrl('/guardian', { replaceUrl: true });
    } catch (error: unknown) {
      this.errorMessage.set(
        'Tu registro quedó creado, pero no pudimos abrir el portal. ' +
        'Inicia sesión con la matrícula de tutor mostrada en esta pantalla.'
      );
    } finally {
      this.entering.set(false);
    }
  }

  goToLogin(): void {
    const params = new URLSearchParams();
    const result = this.result();
    const code = result?.schoolCode ?? this.schoolCode().trim();
    const username = result?.username;
    if (code) {
      params.set('schoolCode', code);
    }
    if (username) {
      params.set('username', username);
    }
    const query = params.toString();
    void this.router.navigateByUrl(
      '/guardian/login' + (query ? `?${query}` : '')
    );
  }

  private resolveDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) {
      return 'Teléfono Android';
    }
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return 'Dispositivo Apple';
    }
    if (/Windows/i.test(userAgent)) {
      return 'Equipo Windows';
    }
    return 'Navegador web';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = typeof error.error?.detail === 'string'
        ? error.error.detail
        : null;

      if (error.status === 404 &&
          detail?.includes('Student enrollment number')) {
        return 'La matrícula capturada no está registrada en la escuela seleccionada. Verifica la matrícula del alumno.';
      }
      if (error.status === 404) {
        return 'No fue posible identificar la escuela para este registro. Verifica el enlace o selecciona nuevamente tu escuela.';
      }
      if (error.status === 409 &&
          detail?.includes('Guardian account already exists')) {
        return 'Ya existe una cuenta de tutor con estos datos en esta escuela. No necesitas registrarte otra vez: inicia sesión con tu cuenta actual o solicita recuperación de acceso al colegio.';
      }
      if (error.status === 409 &&
          detail?.includes('maximum number of guardians')) {
        return 'Este alumno ya tiene el número máximo de tutores permitido por la escuela. Si necesitas corregir o sustituir al tutor registrado, comunícate con el colegio.';
      }
      if (error.status === 409 &&
          detail?.includes('Student is not active')) {
        return 'La matrícula corresponde a un alumno que actualmente no está activo. Comunícate con el colegio.';
      }
      if (error.status === 409) {
        return 'No fue posible crear esta relación con el alumno. Comunícate con el colegio si necesitas corregir un registro existente.';
      }
      if (error.status === 400 && detail) {
        return detail;
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible completar el registro. Intenta nuevamente.';
  }
}
