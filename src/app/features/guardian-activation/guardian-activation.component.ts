import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCycle } from '../academic-cycles/academic-cycle.models';
import { AcademicCycleService } from '../academic-cycles/academic-cycle.service';
import { SchoolGroup } from '../school-groups/school-group.models';
import { SchoolGroupService } from '../school-groups/school-group.service';
import {
  GuardianActivationQuery,
  GuardianActivationState,
  GuardianActivationStatus,
  GuardianActivationSummary,
  GuardianInvitationBatch,
  GuardianInvitationWithUrl,
  GuardianSessionAccess
} from './guardian-activation.models';
import {
  GuardianActivationService
} from './guardian-activation.service';

type ActivationFilter =
  | 'ALL'
  | 'NOT_ACTIVE'
  | 'NOT_INVITED'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED_OR_REVOKED';

type ContactFilter = 'ALL' | 'AVAILABLE' | 'MISSING';

@Component({
  selector: 'app-guardian-activation',
  standalone: true,
  imports: [],
  templateUrl: './guardian-activation.component.html'
})
export class GuardianActivationComponent implements OnInit {

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly activationService =
    inject(GuardianActivationService);
  private readonly academicCycleService = inject(AcademicCycleService);
  private readonly schoolGroupService = inject(SchoolGroupService);
  private readonly searchChanges = new Subject<string>();
  private listRequestId = 0;
  private groupsRequestId = 0;

  readonly statuses = signal<GuardianActivationStatus[]>([]);
  readonly academicCycles = signal<AcademicCycle[]>([]);
  readonly schoolGroups = signal<SchoolGroup[]>([]);
  readonly search = signal('');
  readonly appliedSearch = signal('');
  readonly filter = signal<ActivationFilter>('NOT_ACTIVE');
  readonly contactFilter = signal<ContactFilter>('ALL');
  readonly academicCycleId = signal<number | null>(null);
  readonly gradeName = signal('');
  readonly schoolGroupId = signal<number | null>(null);
  readonly selectedIds = signal<ReadonlySet<number>>(new Set());
  readonly allMatchingSelected = signal(false);
  readonly page = signal(0);
  readonly pageSize = signal(25);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly summary = signal<GuardianActivationSummary>({
    totalGuardians: 0,
    notInvited: 0,
    pending: 0,
    active: 0,
    requiresActivation: 0,
    missingContact: 0
  });
  readonly generatedBatch =
    signal<GuardianInvitationBatch | null>(null);
  readonly generatedInvitations =
    signal<GuardianInvitationWithUrl[]>([]);
  readonly managedGuardian = signal<GuardianActivationStatus | null>(null);
  readonly managedSessions = signal<GuardianSessionAccess[]>([]);

  readonly loading = signal(true);
  readonly loadingCycles = signal(true);
  readonly loadingGroups = signal(false);
  readonly selectingAll = signal(false);
  readonly generating = signal(false);
  readonly revoking = signal(false);
  readonly resettingGuardianId = signal<number | null>(null);
  readonly loadingSessions = signal(false);
  readonly revokingSessionId = signal<number | null>(null);
  readonly copiedGuardianId = signal<number | null>(null);
  readonly copiedAll = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly cycleSelectionWarning = signal<string | null>(null);

  readonly schoolName = computed(
    () => this.authService.currentUser()?.schoolName ?? 'Tu escuela'
  );

  readonly filteredStatuses = computed(() => this.statuses());

  readonly grades = computed(() => [...new Set(
    this.schoolGroups()
      .filter(group => group.active)
      .map(group => group.gradeName)
  )].sort((left, right) => left.localeCompare(right, 'es-MX')));
  readonly groupsForGrade = computed(() => this.schoolGroups()
    .filter(group => group.active)
    .filter(group => !this.gradeName() ||
      group.gradeName === this.gradeName()));
  readonly selectedCycle = computed(() => this.academicCycles()
    .find(cycle => cycle.id === this.academicCycleId()) ?? null);
  readonly generatedPreview = computed(() =>
    this.generatedInvitations().slice(0, 25)
  );
  readonly generatedPurpose = computed(() =>
    this.generatedInvitations()[0]?.purpose ?? 'ACTIVATION'
  );

  readonly firstVisible = computed(() => this.totalElements() === 0
    ? 0
    : this.page() * this.pageSize() + 1);
  readonly lastVisible = computed(() => Math.min(
    (this.page() + 1) * this.pageSize(),
    this.totalElements()
  ));
  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const start = Math.max(0, Math.min(current - 2, total - 5));
    return Array.from(
      { length: Math.min(5, total) },
      (_, index) => Math.max(0, start) + index
    );
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
    this.searchChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(search => {
        this.appliedSearch.set(search);
        this.resetSelection();
        this.loadStatuses(0);
      });
    this.loadAcademicCycles();
  }

  loadStatuses(page = this.page()): void {
    const schoolId = this.schoolId();
    const academicCycleId = this.academicCycleId();
    if (schoolId === null || academicCycleId === null) {
      this.loading.set(false);
      return;
    }

    const requestId = ++this.listRequestId;
    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);

    this.activationService.findPage({
      ...this.activationQuery(),
      page,
      size: this.pageSize()
    })
      .pipe(finalize(() => {
        if (requestId === this.listRequestId) {
          this.loading.set(false);
        }
      }))
      .subscribe({
        next: result => {
          if (requestId !== this.listRequestId) {
            return;
          }
          this.statuses.set(result.content);
          this.page.set(result.page);
          this.pageSize.set(result.size);
          this.totalElements.set(result.totalElements);
          this.totalPages.set(result.totalPages);
          this.summary.set(result.summary);
        },
        error: error => {
          if (requestId !== this.listRequestId) {
            return;
          }
          this.statuses.set([]);
          this.totalElements.set(0);
          this.totalPages.set(0);
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.searchChanges.next(this.search().trim());
  }

  updateFilter(event: Event): void {
    this.filter.set(
      (event.target as HTMLSelectElement).value as ActivationFilter
    );
    this.filtersChanged();
  }

  updateCycle(event: Event): void {
    const cycleId = Number((event.target as HTMLSelectElement).value);
    this.academicCycleId.set(cycleId || null);
    this.gradeName.set('');
    this.schoolGroupId.set(null);
    this.cycleSelectionWarning.set(null);
    this.schoolGroups.set([]);
    if (cycleId > 0) {
      this.loadSchoolGroups(cycleId);
    }
    this.filtersChanged();
  }

  updateGrade(event: Event): void {
    this.gradeName.set((event.target as HTMLSelectElement).value);
    this.schoolGroupId.set(null);
    this.filtersChanged();
  }

  updateGroup(event: Event): void {
    const groupId = Number((event.target as HTMLSelectElement).value);
    this.schoolGroupId.set(groupId || null);
    this.filtersChanged();
  }

  updateContactFilter(event: Event): void {
    this.contactFilter.set(
      (event.target as HTMLSelectElement).value as ContactFilter
    );
    this.filtersChanged();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.page()) {
      return;
    }
    this.loadStatuses(page);
  }

  updatePageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.loadStatuses(0);
  }

  toggleGuardian(guardianId: number): void {
    this.allMatchingSelected.set(false);
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
    this.allMatchingSelected.set(false);
  }

  selectAllMatching(): void {
    if (this.totalElements() === 0 || this.selectingAll()) {
      return;
    }

    this.selectingAll.set(true);
    this.errorMessage.set(null);
    this.activationService.findSelection(this.activationQuery())
      .pipe(finalize(() => this.selectingAll.set(false)))
      .subscribe({
        next: result => {
          this.selectedIds.set(new Set(result.guardianIds));
          this.allMatchingSelected.set(true);
          this.successMessage.set(
            `${result.totalSelected} tutores del filtro quedaron seleccionados.`
          );
        },
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  clearSelection(): void {
    this.resetSelection();
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

    const confirmed = window.confirm(
      `Se generarán ${guardianIds.length} invitaciones. Las invitaciones pendientes anteriores de esos tutores serán reemplazadas. ¿Continuar?`
    );
    if (!confirmed) {
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
          this.showGeneratedBatch(batch);
          this.selectedIds.set(new Set());
          this.allMatchingSelected.set(false);
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

  createPasswordReset(status: GuardianActivationStatus): void {
    const schoolId = this.schoolId();
    if (schoolId === null || this.resettingGuardianId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Se generará un enlace para cambiar la contraseña de ${status.guardianName}. Al utilizarlo se cerrarán sus sesiones anteriores. ¿Continuar?`
    );
    if (!confirmed) {
      return;
    }

    this.resettingGuardianId.set(status.guardianId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.activationService
      .createPasswordResetInvitation(schoolId, status.guardianId)
      .pipe(finalize(() => this.resettingGuardianId.set(null)))
      .subscribe({
        next: batch => {
          this.showGeneratedBatch(batch);
          this.successMessage.set(
            `Se creó el enlace de recuperación para ${status.guardianName}. Compártelo de forma privada.`
          );
          this.loadStatuses();
        },
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  manageSessions(status: GuardianActivationStatus): void {
    if (this.managedGuardian()?.guardianId === status.guardianId) {
      this.closeSessionManager();
      return;
    }

    this.managedGuardian.set(status);
    this.loadManagedSessions(status);
  }

  private loadManagedSessions(status: GuardianActivationStatus): void {
    this.managedSessions.set([]);
    this.loadingSessions.set(true);
    this.errorMessage.set(null);
    this.activationService.findActiveSessions(status.guardianId)
      .pipe(finalize(() => this.loadingSessions.set(false)))
      .subscribe({
        next: sessions => this.managedSessions.set(sessions),
        error: error => this.errorMessage.set(
          this.resolveErrorMessage(error)
        )
      });
  }

  closeSessionManager(): void {
    this.managedGuardian.set(null);
    this.managedSessions.set([]);
  }

  revokeIndividualSession(session: GuardianSessionAccess): void {
    const guardian = this.managedGuardian();
    if (guardian === null || this.revokingSessionId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Se cerrará la sesión “${session.deviceName ?? 'Navegador sin nombre'}”. ¿Continuar?`
    );
    if (!confirmed) {
      return;
    }

    this.revokingSessionId.set(session.sessionId);
    this.errorMessage.set(null);
    this.activationService
      .revokeSession(guardian.guardianId, session.sessionId)
      .pipe(finalize(() => this.revokingSessionId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            `La sesión de ${guardian.guardianName} quedó cerrada.`
          );
          this.loadManagedSessions(guardian);
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
          this.allMatchingSelected.set(false);
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
        'Código de escuela',
        'Usuario',
        'Tipo de enlace',
        'Enlace',
        'Vence'
      ],
      ...invitations.map(item => [
        item.externalReference ?? '',
        item.guardianName,
        item.phone ?? '',
        item.email ?? '',
        item.schoolCode,
        item.username,
        item.purpose === 'PASSWORD_RESET'
          ? 'Recuperación de contraseña'
          : 'Activación',
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
      ACCOUNT_READY: 'Cuenta activa, sin sesión',
      EXPIRED: 'Invitación vencida',
      REVOKED: 'Invitación revocada',
      ACCESS_REVOKED: 'Acceso revocado o vencido',
      INACTIVE: 'Tutor inactivo'
    };
    return labels[state];
  }

  stateClass(state: GuardianActivationState): string {
    if (state === 'ACTIVE' || state === 'ACCOUNT_READY') {
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

  private loadAcademicCycles(): void {
    const schoolId = this.schoolId();
    if (schoolId === null) {
      this.loadingCycles.set(false);
      this.loading.set(false);
      return;
    }

    this.loadingCycles.set(true);
    this.academicCycleService.findAllBySchool(schoolId)
      .pipe(finalize(() => this.loadingCycles.set(false)))
      .subscribe({
        next: cycles => {
          this.academicCycles.set(cycles);
          const selection = this.resolveInitialCycle(cycles);
          if (selection === null) {
            this.loading.set(false);
            this.errorMessage.set(
              'Primero registra un ciclo escolar para administrar tutores.'
            );
            return;
          }

          this.academicCycleId.set(selection.cycle.id);
          this.cycleSelectionWarning.set(selection.exact
            ? null
            : `Ningún ciclo contiene la fecha actual. Se seleccionó ${selection.cycle.name}; confirma que sea el correcto.`);
          this.loadSchoolGroups(selection.cycle.id);
          this.loadStatuses(0);
        },
        error: error => {
          this.loading.set(false);
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  private loadSchoolGroups(academicCycleId: number): void {
    const requestId = ++this.groupsRequestId;
    this.loadingGroups.set(true);
    this.schoolGroupService.findAllByAcademicCycle(academicCycleId)
      .pipe(finalize(() => {
        if (requestId === this.groupsRequestId) {
          this.loadingGroups.set(false);
        }
      }))
      .subscribe({
        next: groups => {
          if (requestId === this.groupsRequestId) {
            this.schoolGroups.set(groups);
          }
        },
        error: error => {
          if (requestId === this.groupsRequestId) {
            this.schoolGroups.set([]);
            this.errorMessage.set(this.resolveErrorMessage(error));
          }
        }
      });
  }

  private resolveInitialCycle(
    cycles: AcademicCycle[]
  ): { cycle: AcademicCycle; exact: boolean } | null {
    if (cycles.length === 0) {
      return null;
    }

    const today = this.localIsoDate(new Date());
    const covering = cycles
      .filter(cycle => cycle.startDate <= today && today <= cycle.endDate)
      .sort((left, right) =>
        Number(right.active) - Number(left.active) ||
        right.startDate.localeCompare(left.startDate));
    if (covering.length > 0) {
      return { cycle: covering[0], exact: true };
    }

    const candidates = cycles.some(cycle => cycle.active)
      ? cycles.filter(cycle => cycle.active)
      : cycles;
    const nearest = [...candidates].sort((left, right) =>
      this.distanceToCycle(left, today) -
      this.distanceToCycle(right, today) ||
      right.startDate.localeCompare(left.startDate))[0];
    return { cycle: nearest, exact: false };
  }

  private distanceToCycle(cycle: AcademicCycle, today: string): number {
    const date = new Date(`${today}T00:00:00`).getTime();
    const start = new Date(`${cycle.startDate}T00:00:00`).getTime();
    const end = new Date(`${cycle.endDate}T00:00:00`).getTime();
    if (date < start) {
      return start - date;
    }
    if (date > end) {
      return date - end;
    }
    return 0;
  }

  private localIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private filtersChanged(): void {
    this.resetSelection();
    this.successMessage.set(null);
    this.loadStatuses(0);
  }

  private showGeneratedBatch(batch: GuardianInvitationBatch): void {
    this.generatedBatch.set(batch);
    this.generatedInvitations.set(
      batch.invitations.map(invitation => ({
        ...invitation,
        activationUrl: this.buildActivationUrl(
          invitation.enrollmentToken
        )
      }))
    );
  }

  private resetSelection(): void {
    this.selectedIds.set(new Set());
    this.allMatchingSelected.set(false);
  }

  private activationQuery(): GuardianActivationQuery {
    const schoolId = this.schoolId();
    const academicCycleId = this.academicCycleId();
    if (schoolId === null || academicCycleId === null) {
      throw new Error('Academic activation scope is incomplete');
    }
    return {
      schoolId,
      academicCycleId,
      search: this.appliedSearch(),
      state: this.filter(),
      schoolGroupId: this.schoolGroupId() ?? undefined,
      gradeName: this.gradeName() || undefined,
      contact: this.contactFilter()
    };
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
