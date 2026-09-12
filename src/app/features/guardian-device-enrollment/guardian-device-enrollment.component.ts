import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  FirebaseMessagingService
} from '../../core/firebase/firebase-messaging.service';
import {
  CompleteGuardianDeviceEnrollmentResponse,
  GuardianIdentity,
  GuardianInvitationStatus
} from './guardian-device-enrollment.models';
import {
  GuardianDeviceEnrollmentService
} from './guardian-device-enrollment.service';

@Component({
  selector: 'app-guardian-device-enrollment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guardian-device-enrollment.component.html'
})
export class GuardianDeviceEnrollmentComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly firebaseMessagingService =
    inject(FirebaseMessagingService);
  private readonly enrollmentService =
    inject(GuardianDeviceEnrollmentService);

  readonly enrollmentToken = this.route.snapshot.queryParamMap
    .get('token')
    ?.trim() ?? '';

  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly completed = signal(false);
  readonly invitation = signal<GuardianInvitationStatus | null>(null);
  readonly activation =
    signal<CompleteGuardianDeviceEnrollmentResponse | null>(null);
  readonly password = signal('');
  readonly passwordConfirmation = signal('');
  readonly enableNotifications = signal(true);
  readonly notificationWarning = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly iosNotificationSetupNeeded = signal(false);
  readonly helpPlaceholder = signal<string | null>(null);

  readonly requiresPassword = computed(() => {
    const invitation = this.invitation();
    return invitation !== null && (
      invitation.purpose === 'PASSWORD_RESET' ||
      !invitation.accountActivated
    );
  });

  readonly isValid = computed(() =>
    this.invitation()?.status === 'VALID'
  );

  readonly iosBrowserSetupRequired = computed(() =>
    this.firebaseMessagingService.isIosDevice()
      && !this.firebaseMessagingService.isStandaloneWebApp()
  );

  readonly safariLoginUrl = computed(() => {
    const activation = this.activation();
    const invitation = this.invitation();
    const schoolCode = activation?.schoolCode ?? invitation?.schoolCode ?? '';
    const username = activation?.username ?? invitation?.username ?? '';

    return this.buildSafariLoginUrl(schoolCode, username);
  });

  async ngOnInit(): Promise<void> {
    if (!this.enrollmentToken) {
      this.errorMessage.set('El enlace de acceso está incompleto.');
      this.loading.set(false);
      return;
    }

    try {
      const invitation = await firstValueFrom(
        this.enrollmentService.loadInvitationStatus(this.enrollmentToken)
      );
      this.invitation.set(invitation);

      const identity = await this.loadCurrentIdentity();
      const alreadyOpen = identity?.guardianId === invitation.guardianId;
      const shouldOpenPortal = alreadyOpen && (
        invitation.status === 'USED' ||
        invitation.purpose === 'ACTIVATION'
      );

      if (shouldOpenPortal) {
        await this.router.navigate(['/guardian'], { replaceUrl: true });
      }
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveStatusErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  updatePassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  updatePasswordConfirmation(event: Event): void {
    this.passwordConfirmation.set(
      (event.target as HTMLInputElement).value
    );
  }

  updateNotificationPreference(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.enableNotifications.set(enabled);
    this.notificationWarning.set(null);
    this.helpPlaceholder.set(null);
    if (!enabled) {
      this.iosNotificationSetupNeeded.set(false);
    }
  }

  async completeAccess(): Promise<void> {
    if (!this.enrollmentToken || !this.isValid() || this.processing()) {
      return;
    }

    if (this.requiresPassword() && !this.validatePassword()) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set(null);
    this.notificationWarning.set(null);
    this.helpPlaceholder.set(null);

    try {
      const fcmToken = await this.resolveOptionalNotificationToken();
      const activation = await firstValueFrom(
        this.enrollmentService.completeEnrollment({
          enrollmentToken: this.enrollmentToken,
          fcmToken,
          deviceName: this.resolveDeviceName(),
          password: this.requiresPassword() ? this.password() : null
        })
      );

      this.activation.set(activation);
      this.completed.set(true);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.invitation.update(current => current === null
          ? null
          : { ...current, status: 'USED' });
      }
      this.errorMessage.set(this.resolveCompletionErrorMessage(error));
    } finally {
      this.processing.set(false);
    }
  }

  openLogin(): void {
    const invitation = this.invitation();
    void this.router.navigate(['/guardian/login'], {
      queryParams: {
        schoolCode: invitation?.schoolCode ?? null,
        username: invitation?.username ?? null,
        returnUrl: '/guardian'
      }
    });
  }

  openPortal(): void {
    void this.router.navigate(['/guardian']);
  }

  showHelpPlaceholder(type: 'guide' | 'video'): void {
    this.helpPlaceholder.set(type === 'guide'
      ? 'Aquí abriremos la guía visual paso a paso. Durante esta prueba el contenido está simulado.'
      : 'Aquí abriremos el video corto de YouTube. Durante esta prueba el enlace está simulado.'
    );
  }

  purposeTitle(invitation: GuardianInvitationStatus): string {
    if (invitation.purpose === 'PASSWORD_RESET') {
      return 'Crea una contraseña nueva';
    }
    return invitation.accountActivated
      ? 'Abre tu portal en este dispositivo'
      : 'Crea tu acceso de tutor';
  }

  private async loadCurrentIdentity(): Promise<GuardianIdentity | null> {
    try {
      return await firstValueFrom(
        this.enrollmentService.loadGuardianIdentity()
      );
    } catch {
      return null;
    }
  }

  private validatePassword(): boolean {
    if (this.password().length < 8 || this.password().length > 72) {
      this.errorMessage.set(
        'La contraseña debe tener entre 8 y 72 caracteres.'
      );
      return false;
    }
    if (this.password() !== this.passwordConfirmation()) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return false;
    }
    return true;
  }

  private async resolveOptionalNotificationToken(): Promise<string | null> {
    if (!this.enableNotifications()) {
      this.iosNotificationSetupNeeded.set(false);
      return null;
    }

    const requiresIosSetup = this.iosBrowserSetupRequired();
    this.iosNotificationSetupNeeded.set(requiresIosSetup);

    try {
      const token = await this.firebaseMessagingService
        .requestPermissionAndGetToken();
      this.iosNotificationSetupNeeded.set(false);
      return token;
    } catch (error: unknown) {
      this.notificationWarning.set(
        this.notificationPermissionMessage(error)
      );
      return null;
    }
  }

  private buildSafariLoginUrl(
    schoolCode: string,
    username: string
  ): string {
    if (typeof window === 'undefined') {
      return '#';
    }

    const params = new URLSearchParams({
      schoolCode,
      username,
      returnUrl: '/guardian'
    });
    const loginUrl = `${window.location.origin}/#/guardian/login?${params}`;

    if (loginUrl.startsWith('https://')) {
      return loginUrl.replace(/^https:/, 'x-safari-https:');
    }
    if (loginUrl.startsWith('http://')) {
      return loginUrl.replace(/^http:/, 'x-safari-http:');
    }
    return loginUrl;
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

  private notificationPermissionMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return `${error.message} El acceso al portal continuará sin avisos.`;
    }
    return 'No se pudieron activar los avisos. El acceso al portal continuará.';
  }

  private resolveStatusErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'La invitación no existe o el enlace está incompleto.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible comprobar esta invitación.';
  }

  private resolveCompletionErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'La invitación no existe o no es válida.';
      }
      if (error.status === 409) {
        return 'Este enlace ya fue utilizado. Inicia sesión con tu cuenta.';
      }
      if (error.status === 410) {
        return 'La invitación venció o fue reemplazada. Solicita una nueva.';
      }
      if (error.status === 400) {
        return 'Revisa la contraseña y vuelve a intentarlo.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible completar el acceso.';
  }
}
