import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import {
  BreadcrumbRouterComponent,
  ColorModeService,
  ContainerComponent,
  DropdownComponent,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  NavItemComponent,
  NavLinkDirective,
  SidebarToggleDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  imports: [
    ContainerComponent,
    HeaderTogglerDirective,
    SidebarToggleDirective,
    IconDirective,
    HeaderNavComponent,
    NavItemComponent,
    NavLinkDirective,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    BreadcrumbRouterComponent,
    DropdownComponent,
    DropdownToggleDirective,
    DropdownMenuDirective,
    DropdownHeaderDirective,
    DropdownItemDirective
  ]
})
export class DefaultHeaderComponent extends HeaderComponent {

  private readonly colorModeService =
    inject(ColorModeService);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  readonly colorMode =
    this.colorModeService.colorMode;

  readonly currentUser =
    this.authService.currentUser;

  readonly loggingOut = signal(false);

  readonly colorModes = [
    {
      name: 'light',
      text: 'Claro',
      icon: 'cilSun'
    },
    {
      name: 'dark',
      text: 'Oscuro',
      icon: 'cilMoon'
    },
    {
      name: 'auto',
      text: 'Automático',
      icon: 'cilContrast'
    }
  ];

  readonly icons = computed(() => {
    const currentMode = this.colorMode();

    return this.colorModes.find(
      mode => mode.name === currentMode
    )?.icon ?? 'cilSun';
  });

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

  readonly sidebarId = input('sidebar1');

  constructor() {
    super();
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    this.authService
      .logout()
      .pipe(
        finalize(() => this.loggingOut.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/login']);
        },
        error: () => {
          void this.router.navigate(['/login']);
        }
      });
  }
}