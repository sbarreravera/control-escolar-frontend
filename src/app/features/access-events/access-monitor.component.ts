import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  Subject,
  debounceTime,
  finalize
} from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { AccessEventType } from './access-event.models';
import {
  AccessMonitorFilterOptions,
  AccessMonitorRow,
  AccessTypeFilter
} from './access-monitor.models';
import { AccessMonitorService } from './access-monitor.service';

@Component({
  selector: 'app-access-monitor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './access-monitor.component.html',
  styleUrl: './access-monitor.component.scss'
})
export class AccessMonitorComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly service = inject(AccessMonitorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<void>();
  private pageRequestId = 0;
  private filtersRequestId = 0;

  private readonly timeFormatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  readonly today = this.schoolLocalDate(new Date());
  readonly schoolName = computed(
    () => this.auth.currentUser()?.schoolName ?? 'Escuela seleccionada'
  );

  readonly filterForm = this.formBuilder.nonNullable.group({
    date: [this.today],
    search: [''],
    academicCycleId: [0],
    schoolGroupId: [0],
    eventType: ['all' as AccessTypeFilter]
  });

  readonly selectedCycleId = signal(0);
  readonly filters = signal<AccessMonitorFilterOptions>({
    cycles: [],
    groups: []
  });
  readonly availableGroups = computed(() =>
    this.filters().groups.filter(
      group => group.academicCycleId === this.selectedCycleId()
    )
  );

  readonly items = signal<AccessMonitorRow[]>([]);
  readonly loading = signal(false);
  readonly loadingFilters = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly filterErrorMessage = signal<string | null>(null);
  readonly page = signal(0);
  readonly pageSize = signal(25);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);

  readonly fromRecord = computed(() =>
    this.totalElements() === 0 ? 0 : this.page() * this.pageSize() + 1
  );
  readonly toRecord = computed(() =>
    Math.min((this.page() + 1) * this.pageSize(), this.totalElements())
  );
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 1) {
      return [];
    }
    const count = Math.min(total, 5);
    const start = Math.min(
      Math.max(0, this.page() - Math.floor(count / 2)),
      total - count
    );
    return Array.from({ length: count }, (_, index) => start + index);
  });

  ngOnInit(): void {
    this.searchChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPage(0));

    this.loadFilters();
    this.loadPage(0);
  }

  loadFilters(): void {
    const schoolId = this.auth.currentUser()?.schoolId;
    if (schoolId === null || schoolId === undefined) {
      return;
    }

    const requestId = ++this.filtersRequestId;
    this.loadingFilters.set(true);
    this.filterErrorMessage.set(null);
    this.service.findFilters(schoolId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.filtersRequestId === requestId) {
            this.loadingFilters.set(false);
          }
        })
      )
      .subscribe({
        next: data => {
          if (this.filtersRequestId === requestId) {
            this.filters.set(data);
          }
        },
        error: (error: HttpErrorResponse) => {
          if (this.filtersRequestId === requestId) {
            this.filterErrorMessage.set(this.resolveError(error));
          }
        }
      });
  }

  loadPage(page = this.page()): void {
    const schoolId = this.auth.currentUser()?.schoolId;
    if (schoolId === null || schoolId === undefined) {
      this.errorMessage.set('Selecciona una escuela para consultar sus accesos.');
      return;
    }

    const query = this.filterForm.getRawValue();
    if (!query.date) {
      this.errorMessage.set('Selecciona una fecha para consultar movimientos.');
      return;
    }

    const requestId = ++this.pageRequestId;
    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.findPage({
      schoolId,
      date: query.date,
      page,
      size: this.pageSize(),
      search: query.search.trim() || undefined,
      academicCycleId: query.academicCycleId || undefined,
      schoolGroupId: query.schoolGroupId || undefined,
      eventType: query.eventType === 'all'
        ? undefined
        : query.eventType as AccessEventType
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.pageRequestId) {
            this.loading.set(false);
          }
        })
      )
      .subscribe({
        next: result => {
          if (requestId !== this.pageRequestId) {
            return;
          }
          this.items.set(result.content);
          this.page.set(result.page);
          this.totalElements.set(result.totalElements);
          this.totalPages.set(result.totalPages);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.pageRequestId) {
            return;
          }
          this.items.set([]);
          this.totalElements.set(0);
          this.totalPages.set(0);
          this.errorMessage.set(this.resolveError(error));
        }
      });
  }

  onSearchInput(): void {
    this.searchChanges.next();
  }

  onDateChange(): void {
    this.loadPage(0);
  }

  onCycleChange(): void {
    this.filterForm.controls.schoolGroupId.setValue(0);
    this.selectedCycleId.set(this.filterForm.controls.academicCycleId.value);
    this.loadPage(0);
  }

  onFilterChange(): void {
    this.loadPage(0);
  }

  moveDay(delta: number): void {
    const date = this.filterForm.controls.date.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    const [year, month, day] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + delta))
      .toISOString().slice(0, 10);
    this.filterForm.controls.date.setValue(next);
    this.loadPage(0);
  }

  chooseToday(): void {
    this.filterForm.controls.date.setValue(this.schoolLocalDate(new Date()));
    this.loadPage(0);
  }

  clearFilters(): void {
    this.filterForm.reset({
      date: this.today,
      search: '',
      academicCycleId: 0,
      schoolGroupId: 0,
      eventType: 'all'
    });
    this.selectedCycleId.set(0);
    this.loadPage(0);
  }

  hasFilters(): boolean {
    const values = this.filterForm.getRawValue();
    return values.date !== this.today ||
      !!values.search.trim() ||
      values.academicCycleId !== 0 ||
      values.schoolGroupId !== 0 ||
      values.eventType !== 'all';
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize.set(Number(target.value));
    this.loadPage(0);
  }

  goToPage(nextPage: number): void {
    if (this.loading() || nextPage < 0 || nextPage >= this.totalPages()) {
      return;
    }
    this.loadPage(nextPage);
  }

  formatTime(value: string): string {
    return this.timeFormatter.format(new Date(value));
  }

  eventLabel(value: AccessEventType): string {
    return value === 'ENTRY' ? 'Entrada' : 'Salida';
  }

  captureLabel(value: AccessMonitorRow['captureMethod']): string {
    switch (value) {
      case 'QR_USB': return 'Lector USB';
      case 'QR_CAMERA': return 'Cámara';
      case 'MANUAL': return 'Manual';
    }
  }

  private schoolLocalDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).formatToParts(date);
    const get = (key: string) => parts.find(part => part.type === key)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private resolveError(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'No tienes permiso para consultar el monitor de esta escuela.';
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }
    if (error.status === 400) {
      return 'Hay un filtro inválido. Revisa la fecha y las opciones seleccionadas.';
    }
    return 'No se pudieron consultar los accesos. Intenta actualizar la tabla.';
  }
}
