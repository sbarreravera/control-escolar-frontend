import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Unsubscribe } from 'firebase/messaging';
import { FirebaseMessagingService } from '../../core/firebase/firebase-messaging.service';
import { GuardianIdentity } from '../guardian-device-enrollment/guardian-device-enrollment.models';
import { GuardianDeviceEnrollmentService } from '../guardian-device-enrollment/guardian-device-enrollment.service';
import {
  GuardianCommunication,
  GuardianCommunicationCategory,
  GuardianCommunicationPriority
} from '../guardian-home/guardian-portal.models';
import { GuardianPortalService } from '../guardian-home/guardian-portal.service';

@Component({
  selector: 'app-guardian-communications',
  standalone: true,
  imports: [],
  templateUrl: './guardian-communications.component.html',
  styleUrl: './guardian-communications.component.scss'
})
export class GuardianCommunicationsComponent
implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollmentService = inject(GuardianDeviceEnrollmentService);
  private readonly portalService = inject(GuardianPortalService);
  private readonly firebaseMessagingService = inject(FirebaseMessagingService);

  private foregroundUnsubscribe?: Unsubscribe;

  readonly identity = signal<GuardianIdentity | null>(null);
  readonly communications = signal<GuardianCommunication[]>([]);
  readonly selected = signal<GuardianCommunication | null>(null);
  readonly loading = signal(true);
  readonly loadingSelected = signal(false);
  readonly acknowledging = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get unreadCount(): number {
    return this.communications().filter(item => item.viewedAt === null).length;
  }

  ngOnInit(): void {
    this.enrollmentService.loadGuardianIdentity().subscribe({
      next: identity => {
        this.identity.set(identity);
        if (identity.notificationsEnabled) {
          this.startForegroundNotifications();
        }
        this.loadCommunications();
      },
      error: error => this.handleAuthenticationError(error)
    });
  }

  ngOnDestroy(): void {
    this.foregroundUnsubscribe?.();
  }

  loadCommunications(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.portalService.findCommunications().subscribe({
      next: items => {
        this.communications.set(items);
        this.loading.set(false);
        const requestedId = this.parsePositiveId(
          this.route.snapshot.queryParamMap.get('communicationId')
        );
        if (requestedId !== null) {
          this.openCommunication(requestedId);
        }
      },
      error: error => {
        this.loading.set(false);
        if (!this.handleAuthenticationError(error)) {
          this.errorMessage.set(this.resolveError(error));
        }
      }
    });
  }

  openCommunication(communicationId: number): void {
    this.loadingSelected.set(true);
    this.errorMessage.set(null);
    this.portalService.viewCommunication(communicationId).subscribe({
      next: communication => {
        this.loadingSelected.set(false);
        this.selected.set(communication);
        this.replaceItem(communication);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { communicationId },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      },
      error: error => {
        this.loadingSelected.set(false);
        if (!this.handleAuthenticationError(error)) {
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 404
              ? 'Este aviso no está disponible para tu cuenta.'
              : this.resolveError(error)
          );
        }
      }
    });
  }

  closeCommunication(): void {
    this.selected.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { communicationId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  acknowledge(): void {
    const current = this.selected();
    if (!current || !current.requiresAcknowledgement || current.acknowledgedAt) {
      return;
    }
    this.acknowledging.set(true);
    this.portalService.acknowledgeCommunication(current.id).subscribe({
      next: communication => {
        this.acknowledging.set(false);
        this.selected.set(communication);
        this.replaceItem(communication);
      },
      error: error => {
        this.acknowledging.set(false);
        if (!this.handleAuthenticationError(error)) {
          this.errorMessage.set(this.resolveError(error));
        }
      }
    });
  }

  backToPortal(): void {
    void this.router.navigate(['/guardian']);
  }

  categoryLabel(category: GuardianCommunicationCategory): string {
    return {
      GENERAL: 'General',
      SCHEDULE: 'Horarios',
      ACADEMIC: 'Escolar',
      EVENT: 'Evento',
      WEATHER: 'Clima',
      EMERGENCY: 'Emergencia',
      REMINDER: 'Recordatorio',
      OTHER: 'Otro'
    }[category];
  }

  priorityLabel(priority: GuardianCommunicationPriority): string {
    return {
      NORMAL: 'Normal',
      IMPORTANT: 'Importante',
      URGENT: 'Urgente'
    }[priority];
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private replaceItem(updated: GuardianCommunication): void {
    this.communications.update(items => items.map(item =>
      item.id === updated.id ? updated : item
    ));
  }

  private startForegroundNotifications(): void {
    void this.firebaseMessagingService
      .listenForForegroundAccessEvents(() => undefined)
      .then(unsubscribe => this.foregroundUnsubscribe = unsubscribe)
      .catch(() => undefined);
  }

  private handleAuthenticationError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse
        && (error.status === 401 || error.status === 403)) {
      void this.router.navigate(['/guardian/login'], {
        queryParams: {
          schoolCode: this.identity()?.schoolCode ?? null,
          username: this.identity()?.username ?? null,
          returnUrl: this.router.url
        },
        replaceUrl: true
      });
      return true;
    }
    return false;
  }

  private parsePositiveId(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No fue posible conectarse con la escuela.';
      }
      const message = error.error?.message ?? error.error?.detail;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    return 'No fue posible cargar los avisos.';
  }
}
