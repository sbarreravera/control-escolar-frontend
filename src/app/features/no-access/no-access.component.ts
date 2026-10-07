import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [],
  template: `
    <div class="container py-5">
      <div
        class="card shadow-sm mx-auto"
        style="max-width: 680px"
      >
        <div class="card-body p-4 p-md-5 text-center">
          <h1 class="h3 mb-3">
            Sin módulos asignados
          </h1>

          <p class="text-body-secondary mb-4">
            Tu cuenta está activa, pero todavía no tiene
            módulos habilitados. Solicita al administrador
            de la escuela que asigne los accesos necesarios.
          </p>

          <button
            class="btn btn-outline-primary"
            type="button"
            (click)="logout()"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `
})
export class NoAccessComponent {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearLocalSession();
        void this.router.navigate(['/login']);
      }
    });
  }
}
