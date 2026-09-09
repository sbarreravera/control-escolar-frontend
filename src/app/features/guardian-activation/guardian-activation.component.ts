import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  GuardianActivationState,
  GuardianActivationStatus,
  GuardianInvitationBatch,
  GuardianInvitationWithUrl
} from './guardian-activation.models';
import {
  GuardianActivationService
} from './guardian-activation.service';

type ActivationFilter =
  | 'ALL'
  | 'NOT_ACTIVE'
  | 'PENDING'
  | 'ACTIVE';

@Component({
  selector: 'app-guardian-activation',
  standalone: true,
  imports: [],
  templateUrl: './guardian-activation.component.html'
})
export class GuardianActivationComponent implements OnInit {

  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);
  private readonly activationService =
    inject(GuardianActivationService);

  readonly statuses = signal<GuardianActivationStatus[]>([]);
  readonly search = signal('');
  readonly filter = signal<ActivationFilter>('NOT_ACTIVE');
  readonly selectedIds = signal<ReadonlySet<number>>(new Set());
  readonly generatedBatch =
    signal<GuardianInvitationBatch | null>(null);
  readonly generatedInvitations =
    signal<GuardianInvitationWithUrl[]>([]);

  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly revoking = signal(false);
  readonly copiedGuardianId = signal<number | null>(null);
  readonly copiedAll = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () => this.authService.currentUser()?.schoolName ?? 'Tu escuela'
  );

  readonly filteredStatuses = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('es-MX');
    const filter = this.filter();

    return this.statuses().filter(status => {
      const matchesSearch = !search || [
        status.guardianName,
        status.externalReference ?? '',
        status.phone ?? '',
        status.email ?? ''
      ].some(value => value.toLocaleLowerCase('es-MX').includes(search));

      if (!matchesSearch) {
        return false;
      }

      if (filter === 'ACTIVE') {
        return status.activationState === 'ACTIVE';
      }

      if (filter === 'PENDING') {
        return status.activationState === 'PENDING';
      }

      if (filter === 'NOT_ACTIVE') {
        return status.guardianActive &&
          status.activationState !== 'ACTIVE';
      }

      return true;
    });
  });

  readonly selectedCount = computed(
    () => this.selectedIds().size
  );

  readonly selectableVisibleIds = computed(
    () => this.filteredStatuses()
      .filter(status => status.guardianActive)
      .map(status => status.guardianId)
  );

  readonly allVisibleSelected = computed(() => {
    const ids = this.selectableVisibleIds();
    const selected = this.selectedIds();
    return ids.length > 0 && ids.every(id => selected.has(id));
  });

  ngOnInit(): void {
    this.loadStatuses();
  }

  loadStatuses(): void {
    const schoolId = this.schoolId();
    if (schoolId === null) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.activationService.findAll(schoolId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: statuses => this.statuses.set(statuses),
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  updateFilter(event: Event): void {
    this.filter.set(
      (event.target as HTMLSelectElement).value as ActivationFilter
    );
  }

  toggleGuardian(guardianId: number): void {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(guardianId)) {
        next.delete(guardianId);
      } else {
        next.add(guardianId);
      }
      return next;
    });
  }

  toggleAllVisible(): void {
    const visibleIds = this.selectableVisibleIds();
    const shouldSelect = !this.allVisibleSelected();

    this.selectedIds.update(current => {
      const next = new Set(current);
      visibleIds.forEach(id => {
        if (shouldSelect) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  }

  createInvitations(): void {
    const schoolId = this.schoolId();
    const guardianIds = [...this.selectedIds()];

    if (
      schoolId === null ||
      guardianIds.length === 0 ||
      this.generating()
    ) {
      return;
    }

    this.generating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.generatedBatch.set(null);
    this.generatedInvitations.set([]);

    this.activationService
      .createInvitations(schoolId, guardianIds)
      .pipe(finalize(() => this.generating.set(false)))
      .subscribe({
        next: batch => {
          this.generatedBatch.set(batch);
          this.generatedInvitations.set(
            batch.invitations.map(invitation => ({
              ...invitation,
              activationUrl: this.buildActivationUrl(
                invitation.enrollmentToken
              )
            }))
          );
          this.selectedIds.set(new Set());
          this.successMessage.set(
            `${batch.invitationsCreated} invitaciones fueron generadas. Descarga el CSV antes de cerrar esta pantalla.`
          );
          this.loadStatuses();
        },
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  revokeSelectedAccess(): void {
    const schoolId = this.schoolId();
    const guardianIds = [...this.selectedIds()];

    if (schoolId === null || guardianIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Se cerrarán las sesiones, se desactivarán los dispositivos y se cancelarán las invitaciones pendientes de ${guardianIds.length} tutor(es). ¿Continuar?`
    );

    if (!confirmed) {
      return;
    }

    this.revoking.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.activationService
      .revokeAccess(schoolId, guardianIds)
      .pipe(finalize(() => this.revoking.set(false)))
      .subscribe({
        next: result => {
          this.selectedIds.set(new Set());
          this.successMessage.set(
            `Acceso revocado para ${result.guardiansProcessed} tutor(es): ${result.sessionsRevoked} sesiones cerradas y ${result.devicesDeactivated} dispositivos desactivados.`
          );
          this.loadStatuses();
        },
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  async copyInvitation(
    invitation: GuardianInvitationWithUrl
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(invitation.activationUrl);
      this.copiedGuardianId.set(invitation.guardianId);
      this.copiedAll.set(false);
    } catch {
      this.errorMessage.set(
        'No fue posible copiar el enlace automáticamente.'
      );
    }
  }

  async copyAllLinks(): Promise<void> {
    const text = this.generatedInvitations()
      .map(item => `${item.guardianName}: ${item.activationUrl}`)
      .join('\n');

    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.copiedAll.set(true);
      this.copiedGuardianId.set(null);
    } catch {
      this.errorMessage.set(
        'No fue posible copiar los enlaces automáticamente.'
      );
    }
  }

  downloadCsv(): void {
    const batch = this.generatedBatch();
    const invitations = this.generatedInvitations();
    if (batch === null || invitations.length === 0) {
      return;
    }

    const rows = [
      [
        'Clave del tutor',
        'Tutor',
        'Teléfono',
        'Correo',
        'Enlace de activación',
        'Vence'
      ],
      ...invitations.map(item => [
        item.externalReference ?? '',
        item.guardianName,
        item.phone ?? '',
        item.email ?? '',
        item.activationUrl,
        item.expiresAt
      ])
    ];

    const csv = '\uFEFF' + rows
      .map(row => row.map(value => this.escapeCsv(value)).join(','))
      .join('\r\n');
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `invitaciones-tutores-${batch.batchId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  stateLabel(state: GuardianActivationState): string {
    const labels: Record<GuardianActivationState, string> = {
      NOT_INVITED: 'Sin invitación',
      PENDING: 'Invitación pendiente',
      ACTIVE: 'Acceso activo',
      EXPIRED: 'Invitación vencida',
      REVOKED: 'Invitación revocada',
      ACCESS_REVOKED: 'Acceso revocado o vencido',
      INACTIVE: 'Tutor inactivo'
    };
    return labels[state];
  }

  stateClass(state: GuardianActivationState): string {
    if (state === 'ACTIVE') {
      return 'text-bg-success';
    }
    if (state === 'PENDING') {
      return 'text-bg-warning';
    }
    if (state === 'INACTIVE') {
      return 'text-bg-dark';
    }
    return 'text-bg-secondary';
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private buildActivationUrl(token: string): string {
    return `${window.location.origin}${window.location.pathname}` +
      '#/guardian/activate?token=' + encodeURIComponent(token);
  }

  private escapeCsv(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }

  private schoolId(): number | null {
    const schoolId = this.authService.currentUser()?.schoolId;
    if (schoolId === null || schoolId === undefined) {
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return null;
    }
    return schoolId;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Uno de los tutores ya no pertenece a esta escuela.';
      }
      if (error.status === 409) {
        return 'La selección contiene un tutor inactivo.';
      }
      if (error.status === 403) {
        return 'No tienes permiso para administrar activaciones.';
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible completar la operación.';
  }
}
