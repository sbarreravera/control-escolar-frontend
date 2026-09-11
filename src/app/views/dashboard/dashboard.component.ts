import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';
import { AuthService } from '../../core/auth/auth.service';
import { SchoolService } from '../../features/schools/school.service';
import {
  DashboardRecentAccessEvent,
  DashboardSummary
} from './dashboard.models';
import { DashboardService } from './dashboard.service';

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss'],
  imports: [
    DatePipe,
    RouterLink,
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    ButtonDirective
  ]
})
export class DashboardComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly schoolService = inject(SchoolService);
  private readonly dashboardService = inject(DashboardService);

  readonly currentUser = this.authService.currentUser;
  readonly schoolCount = signal<number | null>(null);
  readonly loadingSchools = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loadingSummary = signal(false);
  readonly summaryError = signal(false);

  readonly roleLabel = computed(() => {
    switch (this.currentUser()?.role) {
      case 'SUPER_ADMIN':
        return 'Administrador de plataforma';
      case 'ADMIN':
        return 'Administrador escolar';
      case 'OPERATOR':
        return 'Operador';
      default:
        return 'Usuario';
    }
  });

  readonly studentsWithoutGuardian = computed(() => {
    const summary = this.summary();
    return summary
      ? Math.max(
          summary.activeStudents - summary.studentsWithGuardian,
          0
        )
      : 0;
  });

  readonly studentsWithoutCredential = computed(() => {
    const summary = this.summary();
    return summary
      ? Math.max(
          summary.activeStudents - summary.activeCredentials,
          0
        )
      : 0;
  });

  readonly guardiansPendingActivation = computed(() => {
    const summary = this.summary();
    return summary
      ? Math.max(
          summary.activeGuardians - summary.activatedGuardianAccounts,
          0
        )
      : 0;
  });

  readonly guardiansWithoutNotifications = computed(() => {
    const summary = this.summary();
    return summary
      ? Math.max(
          summary.activeGuardians - summary.guardiansWithNotifications,
          0
        )
      : 0;
  });

  readonly todayLabel = new Intl.DateTimeFormat(
    'es-MX',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  ).format(new Date());

  ngOnInit(): void {
    if (this.currentUser()?.role === 'SUPER_ADMIN') {
      this.loadSchoolCount();
      return;
    }

    this.loadSummary();
  }

  refreshSummary(): void {
    this.loadSummary();
  }

  percentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.min(
      Math.round((value / total) * 100),
      100
    );
  }

  eventLabel(event: DashboardRecentAccessEvent): string {
    return event.eventType === 'ENTRY'
      ? 'Entrada'
      : 'Salida';
  }

  private loadSummary(): void {
    const schoolId = this.currentUser()?.schoolId;

    if (!schoolId) {
      this.summary.set(null);
      this.summaryError.set(true);
      return;
    }

    const from = new Date();
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    this.loadingSummary.set(true);
    this.summaryError.set(false);

    this.dashboardService.getSummary(
      schoolId,
      from.toISOString(),
      to.toISOString()
    ).subscribe({
      next: summary => {
        this.summary.set(summary);
        this.loadingSummary.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.summaryError.set(true);
        this.loadingSummary.set(false);
      }
    });
  }

  private loadSchoolCount(): void {
    this.loadingSchools.set(true);

    this.schoolService.findAll().subscribe({
      next: schools => {
        this.schoolCount.set(schools.length);
        this.loadingSchools.set(false);
      },
      error: () => {
        this.schoolCount.set(null);
        this.loadingSchools.set(false);
      }
    });
  }
}
