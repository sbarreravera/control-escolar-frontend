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

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss'],
  imports: [
    RouterLink,
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    ButtonDirective
  ]
})
export class DashboardComponent implements OnInit {

  private readonly authService =
    inject(AuthService);

  private readonly schoolService =
    inject(SchoolService);

  readonly currentUser =
    this.authService.currentUser;

  readonly schoolCount =
    signal<number | null>(null);

  readonly loadingSchools =
    signal(false);

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

  ngOnInit(): void {
    if (
      this.currentUser()?.role === 'SUPER_ADMIN'
    ) {
      this.loadSchoolCount();
    }
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