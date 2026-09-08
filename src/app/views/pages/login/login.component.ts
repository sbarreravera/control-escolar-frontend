import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  FormDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [
    ReactiveFormsModule,
    ContainerComponent,
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    FormDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    IconDirective,
    FormControlDirective,
    ButtonDirective
  ]
})
export class LoginComponent {

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],
    password: [
      '',
      Validators.required
    ]
  });

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, password } =
      this.loginForm.getRawValue();

    this.authService
      .login(email, password)
      .pipe(
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: () => {
          const returnUrl =
            this.route.snapshot.queryParamMap
              .get('returnUrl');

          void this.router.navigateByUrl(
            returnUrl?.startsWith('/')
              ? returnUrl
              : '/dashboard'
          );
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.errorMessage.set(
              'El correo o la contraseña son incorrectos.'
            );
            return;
          }

          if (error.status === 0) {
            this.errorMessage.set(
              'No fue posible conectarse con el servidor.'
            );
            return;
          }

          this.errorMessage.set(
            'No fue posible iniciar sesión. Inténtalo nuevamente.'
          );
        }
      });
  }
}