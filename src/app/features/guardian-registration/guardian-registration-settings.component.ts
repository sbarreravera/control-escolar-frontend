import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { GuardianRegistrationSettings } from './guardian-registration.models';
import { GuardianRegistrationService } from './guardian-registration.service';

@Component({
  selector: 'app-guardian-registration-settings',
  standalone: true,
  imports: [],
  templateUrl: './guardian-registration-settings.component.html'
})
export class GuardianRegistrationSettingsComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly registrationService = inject(GuardianRegistrationService);

  readonly settings = signal<GuardianRegistrationSettings | null>(null);
  readonly enabled = signal(false);
  readonly minimum = signal(1);
  readonly maximum = signal(99);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly rotating = signal(false);
  readonly copied = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly registrationUrl = computed(() => {
    const settings = this.settings();
    if (!settings) {
      return '';
    }
    return `${window.location.origin}${window.location.pathname}` +
      '#/guardian/register?token=' +
      encodeURIComponent(settings.registrationToken);
  });

  ngOnInit(): void {
    this.load();
  }

  updateEnabled(event: Event): void {
    this.enabled.set((event.target as HTMLInputElement).checked);
  }

  updateMinimum(event: Event): void {
    this.minimum.set(Number((event.target as HTMLInputElement).value));
  }

  updateMaximum(event: Event): void {
    this.maximum.set(Number((event.target as HTMLInputElement).value));
  }

  save(): void {
    const schoolId = this.schoolId();
    if (schoolId === null || this.saving()) {
      return;
    }
    if (this.minimum() < 0 || this.maximum() < 1 ||
        this.maximum() < this.minimum()) {
      this.errorMessage.set(
        'El máximo de tutores debe ser mayor o igual al mínimo.'
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.registrationService.updateSettings(schoolId, {
      enabled: this.enabled(),
      minimumGuardiansPerStudent: this.minimum(),
      maximumGuardiansPerStudent: this.maximum()
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: settings => {
          this.applySettings(settings);
          this.successMessage.set('Configuración de autoregistro guardada.');
        },
        error: error => this.errorMessage.set(this.resolveErrorMessage(error))
      });
  }

  rotateToken(): void {
    const schoolId = this.schoolId();
    if (schoolId === null || this.rotating()) {
      return;
    }
    if (!window.confirm(
      'Se generará un enlace nuevo y el anterior dejará de funcionar. ¿Continuar?'
    )) {
      return;
    }

    this.rotating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.registrationService.rotateToken(schoolId)
      .pipe(finalize(() => this.rotating.set(false)))
      .subscribe({
        next: settings => {
          this.applySettings(settings);
          this.successMessage.set('Se generó un nuevo enlace de registro.');
        },
        error: error => this.errorMessage.set(this.resolveErrorMessage(error))
      });
  }

  async copyUrl(): Promise<void> {
    const url = this.registrationUrl();
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      window.setTimeout(() => this.copied.set(false), 1800);
    } catch {
      this.errorMessage.set('No fue posible copiar el enlace automáticamente.');
    }
  }

  private load(): void {
    const schoolId = this.schoolId();
    if (schoolId === null) {
      this.loading.set(false);
      return;
    }
    this.registrationService.loadSettings(schoolId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: settings => this.applySettings(settings),
        error: error => this.errorMessage.set(this.resolveErrorMessage(error))
      });
  }

  private applySettings(settings: GuardianRegistrationSettings): void {
    this.settings.set(settings);
    this.enabled.set(settings.enabled);
    this.minimum.set(settings.minimumGuardiansPerStudent);
    this.maximum.set(settings.maximumGuardiansPerStudent);
  }

  private schoolId(): number | null {
    return this.authService.currentUser()?.schoolId ?? null;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return 'No puedes reducir el máximo todavía porque hay alumnos que ya tienen más tutores asociados. Corrige esas relaciones primero.';
      }
      if (error.status === 403) {
        return 'No tienes permiso para modificar esta configuración.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible guardar la configuración de autoregistro.';
  }
}
