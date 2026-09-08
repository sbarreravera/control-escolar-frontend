import {
  Component,
  inject
} from '@angular/core';
import {
  RouterLink,
  RouterOutlet
} from '@angular/router';
import { NgScrollbar } from 'ngx-scrollbar';

import {
  ContainerComponent,
  ShadowOnScrollDirective,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarFooterComponent,
  SidebarHeaderComponent,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerDirective
} from '@coreui/angular';

import {
  AuthService
} from '../../core/auth/auth.service';
import {
  DefaultFooterComponent,
  DefaultHeaderComponent
} from './';
import { buildNavItems } from './_nav';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html',
  styleUrls: [
    './default-layout.component.scss'
  ],
  imports: [
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarBrandComponent,
    SidebarNavComponent,
    SidebarFooterComponent,
    SidebarToggleDirective,
    SidebarTogglerDirective,
    ContainerComponent,
    DefaultFooterComponent,
    DefaultHeaderComponent,
    NgScrollbar,
    RouterOutlet,
    RouterLink,
    ShadowOnScrollDirective
  ]
})
export class DefaultLayoutComponent {

  private readonly authService = inject(AuthService);

  private readonly currentUser =
    this.authService.currentUser();

  readonly navItems = this.currentUser
    ? buildNavItems(this.currentUser.role)
    : [];
}