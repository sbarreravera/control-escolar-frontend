import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  Observable,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import {
  AuthenticatedUser,
  CsrfTokenResponse
} from './auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);

  private readonly currentUserState =
    signal<AuthenticatedUser | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();

  readonly authenticated = computed(
    () => this.currentUserState() !== null
  );

  login(
    email: string,
    password: string
  ): Observable<AuthenticatedUser> {
    return this.requestCsrfToken().pipe(
      switchMap(() => {
        const body = new HttpParams()
          .set('email', email.trim())
          .set('password', password);

        return this.http.post<void>(
          '/api/v1/auth/login',
          body,
          {
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded'
            }
          }
        );
      }),
      switchMap(() => this.loadCurrentUser())
    );
  }

  loadCurrentUser(): Observable<AuthenticatedUser> {
    return this.http
      .get<AuthenticatedUser>('/api/v1/auth/me')
      .pipe(
        tap(user => this.currentUserState.set(user))
      );
  }

  logout(): Observable<void> {
    return this.requestCsrfToken().pipe(
      switchMap(() =>
        this.http.post<void>(
          '/api/v1/auth/logout',
          null
        )
      ),
      tap(() => this.currentUserState.set(null)),
      catchError(error => {
        this.currentUserState.set(null);
        return throwError(() => error);
      })
    );
  }

  clearLocalSession(): void {
    this.currentUserState.set(null);
  }

  private requestCsrfToken():
    Observable<CsrfTokenResponse> {
    return this.http.get<CsrfTokenResponse>(
      '/api/v1/auth/csrf'
    );
  }
}