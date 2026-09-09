import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { finalize } from 'rxjs';
import {
  GuardianIdentity
} from '../guardian-device-enrollment/guardian-device-enrollment.models';
import {
  GuardianDeviceEnrollmentService
} from '../guardian-device-enrollment/guardian-device-enrollment.service';

@Component({
  selector: 'app-guardian-home',
  standalone: true,
  imports: [],
  templateUrl: './guardian-home.component.html'
})
export class GuardianHomeComponent implements OnInit {

  private readonly enrollmentService =
    inject(GuardianDeviceEnrollmentService);

  readonly identity = signal<GuardianIdentity | null>(null);
  readonly loading = signal(true);
  readonly loggingOut = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadIdentity();
  }

  loadIdentity(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.enrollmentService.loadGuardianIdentity()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: identity => this.identity.set(identity),
        error: error => {
          this.identity.set(null);
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);
    this.errorMessage.set(null);

    this.enrollmentService.logoutGuardian()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => this.identity.set(null),
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  formatExpiration(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Este dispositivo no tiene una sesión de tutor activa. Solicita una nueva invitación a la escuela.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible comprobar tu acceso.';
  }
}
