import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  GuardianDeviceEnrollmentService
} from '../guardian-device-enrollment/guardian-device-enrollment.service';

@Component({
  selector: 'app-guardian-password-recovery',
  standalone: true,
  imports: [],
  templateUrl: './guardian-password-recovery.component.html',
  styleUrl: './guardian-login.component.scss'
})
export class GuardianPasswordRecoveryComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollmentService =
    inject(GuardianDeviceEnrollmentService);

  readonly schoolCode = signal(
    this.route.snapshot.queryParamMap.get('schoolCode')?.trim() ?? ''
  );
  readonly email = signal('');
  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly errorMessage = signal<string | null>(null);

  updateSchoolCode(event: Event): void {
    this.schoolCode.set((event.target as HTMLInputElement).value);
  }

  updateEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  async submit(): Promise<void> {
    const schoolCode = this.schoolCode().trim();
    const email = this.email().trim();

    if (this.submitting()) {
      return;
    }

    if (!schoolCode || !email) {
      this.errorMessage.set(
        'Captura el código de escuela y el correo que registraste.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.errorMessage.set('Captura un correo electrónico válido.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await firstValueFrom(
        this.enrollmentService.requestGuardianPasswordReset({
          schoolCode,
          email
        })
      );
      this.sent.set(true);
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  openLogin(): void {
    const schoolCode = this.schoolCode().trim();
    void this.router.navigate(['/guardian/login'], {
      queryParams: schoolCode ? { schoolCode } : undefined
    });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return 'Revisa el código de escuela y el correo capturado.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }

    return 'No fue posible solicitar la recuperación. Intenta nuevamente.';
  }
}
