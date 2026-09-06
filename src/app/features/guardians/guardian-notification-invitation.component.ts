import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';

import {
  GuardianDeviceEnrollmentInvitation
} from '../guardian-device-enrollment/guardian-device-enrollment.models';
import {
  GuardianDeviceEnrollmentService
} from '../guardian-device-enrollment/guardian-device-enrollment.service';
import {
  Guardian
} from './guardian.models';

@Component({
  selector: 'app-guardian-notification-invitation',
  standalone: true,
  templateUrl:
    './guardian-notification-invitation.component.html'
})
export class GuardianNotificationInvitationComponent {

  private readonly enrollmentService =
    inject(GuardianDeviceEnrollmentService);

  readonly guardians =
    input.required<readonly Guardian[]>();

  readonly activeGuardians = computed(
    () =>
      this.guardians().filter(
        guardian => guardian.active
      )
  );

  readonly selectedGuardianId =
    signal<number | null>(null);

  readonly creatingInvitation = signal(false);

  readonly invitation =
    signal<GuardianDeviceEnrollmentInvitation | null>(
      null
    );

  readonly invitationUrl = signal<string | null>(null);
  readonly invitationQrDataUrl =
    signal<string | null>(null);

  readonly errorMessage = signal<string | null>(null);
  readonly copied = signal(false);

  selectGuardian(event: Event): void {
    const value =
      (event.target as HTMLSelectElement).value;

    this.selectedGuardianId.set(
      value ? Number(value) : null
    );

    this.clearInvitation();
  }

  async createInvitation(): Promise<void> {
    const guardianId = this.selectedGuardianId();

    if (
      guardianId === null ||
      this.creatingInvitation()
    ) {
      return;
    }

    this.creatingInvitation.set(true);
    this.errorMessage.set(null);
    this.copied.set(false);

    try {
      const invitation = await firstValueFrom(
        this.enrollmentService.createInvitation(
          guardianId
        )
      );

      const invitationUrl =
        this.buildInvitationUrl(
          invitation.enrollmentToken
        );

      const qrDataUrl = await QRCode.toDataURL(
        invitationUrl,
        {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'M'
        }
      );

      this.invitation.set(invitation);
      this.invitationUrl.set(invitationUrl);
      this.invitationQrDataUrl.set(qrDataUrl);
    } catch (error: unknown) {
      this.errorMessage.set(
        this.resolveErrorMessage(error)
      );
    } finally {
      this.creatingInvitation.set(false);
    }
  }

  async copyInvitationLink(): Promise<void> {
    const invitationUrl = this.invitationUrl();

    if (!invitationUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        invitationUrl
      );

      this.copied.set(true);
      this.errorMessage.set(null);
    } catch {
      this.copied.set(false);
      this.errorMessage.set(
        'No fue posible copiar automáticamente. Selecciona y copia el enlace manualmente.'
      );
    }
  }

  closeInvitation(): void {
    this.clearInvitation();
  }

  formatExpiration(expiresAt: string): string {
    return new Intl.DateTimeFormat(
      'es-MX',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    ).format(new Date(expiresAt));
  }

  private clearInvitation(): void {
    this.invitation.set(null);
    this.invitationUrl.set(null);
    this.invitationQrDataUrl.set(null);
    this.errorMessage.set(null);
    this.copied.set(false);
  }

  private buildInvitationUrl(
    enrollmentToken: string
  ): string {
    const basePath =
      window.location.pathname.endsWith('/')
        ? window.location.pathname
        : `${window.location.pathname}/`;

    return (
      `${window.location.origin}${basePath}` +
      '#/activate-notifications?token=' +
      encodeURIComponent(enrollmentToken)
    );
  }

  private resolveErrorMessage(
    error: unknown
  ): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'No se encontró el tutor seleccionado.';
      }

      if (error.status === 409) {
        return 'El tutor está inactivo y no puede recibir invitaciones.';
      }

      if (error.status === 403) {
        return 'No tienes permiso para generar esta invitación.';
      }

      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }

    return 'No fue posible generar la invitación.';
  }
}