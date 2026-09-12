import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  FirebaseMessagingService
} from '../../core/firebase/firebase-messaging.service';
import {
  GuardianDeviceEnrollmentService
} from '../guardian-device-enrollment/guardian-device-enrollment.service';

@Component({
  selector: 'app-guardian-login',
  standalone: true,
  imports: [],
  templateUrl: './guardian-login.component.html'
})
export class GuardianLoginComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollmentService =
    inject(GuardianDeviceEnrollmentService);
  private readonly firebaseMessagingService =
    inject(FirebaseMessagingService);

  readonly schoolCode = signal(
    this.route.snapshot.queryParamMap.get('schoolCode')?.trim() ?? ''
  );
  readonly username = signal(
    this.route.snapshot.queryParamMap.get('username')?.trim() ?? ''
  );
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly returnUrl = this.safeReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl')
  );

  updateSchoolCode(event: Event): void {
    this.schoolCode.set((event.target as HTMLInputElement).value);
  }

  updateUsername(event: Event): void {
    this.username.set((event.target as HTMLInputElement).value);
  }

  updatePassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  async submit(): Promise<void> {
    const schoolCode = this.schoolCode().trim();
    const username = this.username().trim();
    const password = this.password();

    if (!schoolCode || !username || !password || this.submitting()) {
      if (!schoolCode || !username || !password) {
        this.errorMessage.set('Completa escuela, usuario y contraseña.');
      }
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const fcmToken = await this.firebaseMessagingService
        .getExistingTokenIfPermitted();
      await firstValueFrom(this.enrollmentService.loginGuardian({
        schoolCode,
        username,
        password,
        fcmToken,
        deviceName: this.resolveDeviceName()
      }));
      await this.router.navigateByUrl(this.returnUrl, {
        replaceUrl: true
      });
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private safeReturnUrl(value: string | null): string {
    if (value?.startsWith('/guardian') &&
        !value.startsWith('/guardian/login')) {
      return value;
    }
    return '/guardian';
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
      if (error.status === 401) {
        return 'El código de escuela, el usuario o la contraseña no son correctos.';
      }
      if (error.status === 429) {
        return 'La cuenta está bloqueada por unos minutos debido a varios intentos fallidos.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  }
}
