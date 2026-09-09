import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Unsubscribe } from 'firebase/messaging';
import { finalize, firstValueFrom } from 'rxjs';
import {
  FirebaseMessagingService
} from '../../core/firebase/firebase-messaging.service';
import {
  GuardianIdentity
} from '../guardian-device-enrollment/guardian-device-enrollment.models';
import {
  GuardianDeviceEnrollmentService
} from '../guardian-device-enrollment/guardian-device-enrollment.service';
import {
  GuardianAccessEvent,
  GuardianAccessEventType,
  GuardianStudent
} from './guardian-portal.models';
import { GuardianPortalService } from './guardian-portal.service';

@Component({
  selector: 'app-guardian-home',
  standalone: true,
  imports: [],
  templateUrl: './guardian-home.component.html',
  styleUrl: './guardian-home.component.scss'
})
export class GuardianHomeComponent implements OnInit, OnDestroy {

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollmentService =
    inject(GuardianDeviceEnrollmentService);
  private readonly portalService = inject(GuardianPortalService);
  private readonly firebaseMessagingService =
    inject(FirebaseMessagingService);

  private historyRequestId = 0;
  private highlightedRequestId = 0;
  private foregroundUnsubscribe?: Unsubscribe;

  readonly identity = signal<GuardianIdentity | null>(null);
  readonly students = signal<GuardianStudent[]>([]);
  readonly events = signal<GuardianAccessEvent[]>([]);
  readonly highlightedEvent = signal<GuardianAccessEvent | null>(null);
  readonly requestedEventId = signal<number | null>(null);

  readonly loadingIdentity = signal(true);
  readonly loadingStudents = signal(false);
  readonly loadingHistory = signal(false);
  readonly loadingHighlightedEvent = signal(false);
  readonly loggingOut = signal(false);
  readonly enablingNotifications = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly historyErrorMessage = signal<string | null>(null);
  readonly highlightedErrorMessage = signal<string | null>(null);
  readonly liveMessage = signal<string | null>(null);
  readonly notificationMessage = signal<string | null>(null);
  readonly notificationMessageIsError = signal(false);

  readonly selectedStudentId = signal<number | null>(null);
  readonly selectedEventType = signal<GuardianAccessEventType | null>(null);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly lastUpdated = signal<Date | null>(null);

  readonly hasFilters = computed(() =>
    this.selectedStudentId() !== null ||
    this.selectedEventType() !== null ||
    this.dateFrom() !== '' ||
    this.dateTo() !== ''
  );

  readonly rangeStart = computed(() =>
    this.totalElements() === 0
      ? 0
      : this.page() * this.pageSize() + 1
  );

  readonly rangeEnd = computed(() => Math.min(
    (this.page() + 1) * this.pageSize(),
    this.totalElements()
  ));

  readonly pageNumbers = computed(() => {
    const totalPages = this.totalPages();

    if (totalPages <= 1) {
      return [];
    }

    const visiblePages = Math.min(totalPages, 5);
    let firstPage = Math.max(
      0,
      this.page() - Math.floor(visiblePages / 2)
    );

    firstPage = Math.min(firstPage, totalPages - visiblePages);

    return Array.from(
      { length: visiblePages },
      (_, index) => firstPage + index
    );
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const eventId = this.parsePositiveId(params.get('eventId'));
        this.requestedEventId.set(eventId);

        if (this.identity() && eventId !== null) {
          this.loadHighlightedEvent(eventId);
        } else if (eventId === null) {
          this.clearHighlightedState();
        }
      });

    this.loadIdentity();
  }

  ngOnDestroy(): void {
    this.foregroundUnsubscribe?.();
  }

  loadIdentity(): void {
    this.loadingIdentity.set(true);
    this.errorMessage.set(null);

    this.enrollmentService.loadGuardianIdentity()
      .pipe(finalize(() => this.loadingIdentity.set(false)))
      .subscribe({
        next: identity => {
          this.identity.set(identity);
          this.loadPortalData();
          if (identity.notificationsEnabled) {
            this.startForegroundNotifications();
          }

          const eventId = this.requestedEventId();
          if (eventId !== null) {
            this.loadHighlightedEvent(eventId);
          }
        },
        error: error => {
          this.identity.set(null);
          if (this.isAuthenticationError(error)) {
            this.openLogin();
            return;
          }
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  loadPortalData(): void {
    this.loadStudents();
    this.loadHistory(0);
  }

  loadStudents(): void {
    this.loadingStudents.set(true);

    this.portalService.findStudents()
      .pipe(finalize(() => this.loadingStudents.set(false)))
      .subscribe({
        next: students => this.students.set(students),
        error: error => this.historyErrorMessage.set(
          this.resolveDataErrorMessage(error)
        )
      });
  }

  loadHistory(page = this.page()): void {
    if (!this.validateDateRange()) {
      return;
    }

    const requestId = ++this.historyRequestId;
    this.page.set(page);
    this.loadingHistory.set(true);
    this.historyErrorMessage.set(null);

    const occurredFrom = this.dateFrom()
      ? this.toLocalBoundary(this.dateFrom(), false)
      : undefined;
    const occurredTo = this.dateTo()
      ? this.toLocalBoundary(this.dateTo(), true)
      : undefined;

    this.portalService.findHistory({
      page,
      size: this.pageSize(),
      studentId: this.selectedStudentId() ?? undefined,
      eventType: this.selectedEventType() ?? undefined,
      occurredFrom,
      occurredTo
    })
      .pipe(finalize(() => {
        if (requestId === this.historyRequestId) {
          this.loadingHistory.set(false);
        }
      }))
      .subscribe({
        next: result => {
          if (requestId !== this.historyRequestId) {
            return;
          }

          this.events.set(result.content);
          this.page.set(result.page);
          this.pageSize.set(result.size);
          this.totalElements.set(result.totalElements);
          this.totalPages.set(result.totalPages);
          this.lastUpdated.set(new Date());
        },
        error: error => {
          if (requestId === this.historyRequestId) {
            this.historyErrorMessage.set(
              this.resolveDataErrorMessage(error)
            );
          }
        }
      });
  }

  loadHighlightedEvent(eventId: number): void {
    const requestId = ++this.highlightedRequestId;
    this.loadingHighlightedEvent.set(true);
    this.highlightedErrorMessage.set(null);

    this.portalService.findEvent(eventId)
      .pipe(finalize(() => {
        if (requestId === this.highlightedRequestId) {
          this.loadingHighlightedEvent.set(false);
        }
      }))
      .subscribe({
        next: event => {
          if (requestId === this.highlightedRequestId) {
            this.highlightedEvent.set(event);
          }
        },
        error: error => {
          if (requestId !== this.highlightedRequestId) {
            return;
          }

          this.highlightedEvent.set(null);
          this.highlightedErrorMessage.set(
            error instanceof HttpErrorResponse && error.status === 404
              ? 'Este evento no está disponible para tu cuenta.'
              : this.resolveDataErrorMessage(error)
          );
        }
      });
  }

  applyFilters(): void {
    this.loadHistory(0);
  }

  clearFilters(): void {
    this.selectedStudentId.set(null);
    this.selectedEventType.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.loadHistory(0);
  }

  viewStudentHistory(studentId: number): void {
    this.selectedStudentId.set(studentId);
    this.loadHistory(0);
    document.querySelector('#guardian-history')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  onStudentFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStudentId.set(this.parsePositiveId(value));
  }

  onEventTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedEventType.set(
      value === 'ENTRY' || value === 'EXIT'
        ? value
        : null
    );
  }

  onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  dismissHighlightedEvent(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { eventId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);
    this.errorMessage.set(null);

    const currentIdentity = this.identity();
    this.enrollmentService.logoutGuardian()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          this.identity.set(null);
          this.students.set([]);
          this.events.set([]);
          this.clearHighlightedState();
          this.foregroundUnsubscribe?.();
          this.foregroundUnsubscribe = undefined;
          void this.router.navigate(['/guardian/login'], {
            queryParams: {
              schoolCode: currentIdentity?.schoolCode ?? null,
              username: currentIdentity?.username ?? null,
              returnUrl: '/guardian'
            },
            replaceUrl: true
          });
        },
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  async enableNotificationsOnThisDevice(): Promise<void> {
    if (this.enablingNotifications()) {
      return;
    }

    this.enablingNotifications.set(true);
    this.notificationMessage.set(null);
    this.notificationMessageIsError.set(false);
    try {
      const fcmToken = await this.firebaseMessagingService
        .requestPermissionAndGetToken();
      await firstValueFrom(this.enrollmentService.registerCurrentDevice({
        fcmToken,
        deviceName: this.resolveDeviceName()
      }));
      this.identity.update(current => current === null
        ? null
        : { ...current, notificationsEnabled: true });
      this.notificationMessage.set(
        'Los avisos quedaron activados en este dispositivo.'
      );
      this.notificationMessageIsError.set(false);
      this.startForegroundNotifications();
    } catch (error: unknown) {
      this.notificationMessageIsError.set(true);
      this.notificationMessage.set(this.resolveNotificationError(error));
    } finally {
      this.enablingNotifications.set(false);
    }
  }

  openLogin(): void {
    const currentIdentity = this.identity();
    void this.router.navigate(['/guardian/login'], {
      queryParams: {
        schoolCode: currentIdentity?.schoolCode ?? null,
        username: currentIdentity?.username ?? null,
        returnUrl: this.router.url.startsWith('/guardian')
          ? this.router.url
          : '/guardian'
      },
      replaceUrl: true
    });
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  formatExpiration(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  formatLastUpdated(value: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(value);
  }

  eventTypeLabel(eventType: GuardianAccessEventType): string {
    return eventType === 'ENTRY' ? 'Entrada' : 'Salida';
  }

  studentGroupLabel(student: GuardianStudent): string {
    const gradeAndGroup = [student.gradeName, student.groupName]
      .filter(Boolean)
      .join(' · ');

    return [gradeAndGroup, student.academicCycleName]
      .filter(Boolean)
      .join(' | ') || 'Sin grupo vigente';
  }

  private validateDateRange(): boolean {
    if (this.dateFrom() && this.dateTo()
        && this.dateFrom() > this.dateTo()) {
      this.historyErrorMessage.set(
        'La fecha inicial no puede ser posterior a la fecha final.'
      );
      return false;
    }

    return true;
  }

  private toLocalBoundary(value: string, nextDay: boolean): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (nextDay) {
      date.setDate(date.getDate() + 1);
    }

    return date.toISOString();
  }

  private parsePositiveId(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0
      ? parsed
      : null;
  }

  private clearHighlightedState(): void {
    this.highlightedRequestId++;
    this.highlightedEvent.set(null);
    this.highlightedErrorMessage.set(null);
    this.loadingHighlightedEvent.set(false);
  }

  private startForegroundNotifications(): void {
    if (this.foregroundUnsubscribe) {
      return;
    }

    void this.firebaseMessagingService
      .listenForForegroundAccessEvents(eventId => {
        this.liveMessage.set(
          'Se registró un movimiento nuevo. El historial se actualizó.'
        );
        this.loadStudents();
        this.loadHistory(0);

        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { eventId },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      })
      .then(unsubscribe => {
        this.foregroundUnsubscribe = unsubscribe;
      })
      .catch(() => {
        this.notificationMessageIsError.set(true);
        this.notificationMessage.set(
          'Los avisos están registrados, pero no fue posible escucharlos en esta pestaña.'
        );
      });
  }

  private resolveNotificationError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return 'Este navegador ya está vinculado a otra cuenta de tutor.';
      }
      if (error.status === 401 || error.status === 403) {
        this.openLogin();
        return 'Tu sesión terminó. Inicia sesión y vuelve a intentarlo.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'No fue posible activar los avisos en este dispositivo.';
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

  private isAuthenticationError(error: unknown): boolean {
    return error instanceof HttpErrorResponse &&
      (error.status === 401 || error.status === 403);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Tu sesión terminó. Inicia sesión nuevamente.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible comprobar tu acceso.';
  }

  private resolveDataErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        this.openLogin();
        return 'Tu sesión terminó. Inicia sesión nuevamente.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }

    return 'No fue posible consultar la información. Intenta nuevamente.';
  }
}
