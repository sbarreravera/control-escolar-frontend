import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  FirebaseMessagingService
} from '../../core/firebase/firebase-messaging.service';
import {
  GuardianDeviceEnrollmentService
} from './guardian-device-enrollment.service';

@Component({
  selector: 'app-guardian-device-enrollment',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl:
    './guardian-device-enrollment.component.html'
})
export class GuardianDeviceEnrollmentComponent {

  private readonly route = inject(ActivatedRoute);

  private readonly firebaseMessagingService =
    inject(FirebaseMessagingService);

  private readonly enrollmentService =
    inject(GuardianDeviceEnrollmentService);

  readonly enrollmentToken =
    this.route.snapshot.queryParamMap
      .get('token')
      ?.trim() ?? '';

  readonly processing = signal(false);
  readonly completed = signal(false);

  readonly errorMessage = signal<string | null>(
    this.enrollmentToken
      ? null
      : 'El enlace de vinculación está incompleto.'
  );

  async activateNotifications(): Promise<void> {
    if (!this.enrollmentToken || this.processing()) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set(null);

    try {
      const fcmToken =
        await this.firebaseMessagingService
          .requestPermissionAndGetToken();

      await firstValueFrom(
        this.enrollmentService.completeEnrollment({
          enrollmentToken: this.enrollmentToken,
          fcmToken,
          deviceName: this.resolveDeviceName()
        })
      );

      this.completed.set(true);
    } catch (error: unknown) {
      this.errorMessage.set(
        this.resolveErrorMessage(error)
      );
    } finally {
      this.processing.set(false);
    }
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
      if (error.status === 404) {
        return 'La invitación no existe o no es válida.';
      }

      if (error.status === 409) {
        return 'La invitación ya fue utilizada o el dispositivo no puede vincularse.';
      }

      if (error.status === 410) {
        return 'La invitación venció o fue reemplazada. Solicita una nueva.';
      }

      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }

      return 'No fue posible vincular el dispositivo.';
    }

    if (
      error instanceof Error &&
      error.message.trim()
    ) {
      return error.message;
    }

    return 'No fue posible activar las notificaciones.';
  }
}