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
  private readonly managedSchoolStorageKey =
    'control-escolar.super-admin.school-context';

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
        tap(user => this.currentUserState.set(
          this.applyManagedSchoolContext(user)
        ))
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
      tap(() => {
        this.clearStoredManagedSchool();
        this.currentUserState.set(null);
      }),
      catchError(error => {
        this.clearStoredManagedSchool();
        this.currentUserState.set(null);
        return throwError(() => error);
      })
    );
  }

  selectManagedSchool(
    schoolId: number,
    schoolName: string
  ): void {
    const currentUser = this.currentUserState();

    if (
      currentUser?.role !== 'SUPER_ADMIN' ||
      !Number.isSafeInteger(schoolId) ||
      schoolId <= 0
    ) {
      return;
    }

    const context = {
      schoolId,
      schoolName: schoolName.trim()
    };

    try {
      sessionStorage.setItem(
        this.managedSchoolStorageKey,
        JSON.stringify(context)
      );
    } catch {
      // El contexto seguirá vigente durante esta navegación.
    }

    this.currentUserState.set({
      ...currentUser,
      schoolId: context.schoolId,
      schoolName: context.schoolName
    });
  }

  clearManagedSchool(): void {
    this.clearStoredManagedSchool();

    const currentUser = this.currentUserState();
    if (currentUser?.role !== 'SUPER_ADMIN') {
      return;
    }

    this.currentUserState.set({
      ...currentUser,
      schoolId: null,
      schoolName: null
    });
  }

  clearLocalSession(): void {
    this.clearStoredManagedSchool();
    this.currentUserState.set(null);
  }

  private applyManagedSchoolContext(
    user: AuthenticatedUser
  ): AuthenticatedUser {
    if (user.role !== 'SUPER_ADMIN') {
      this.clearStoredManagedSchool();
      return user;
    }

    try {
      const rawContext = sessionStorage.getItem(
        this.managedSchoolStorageKey
      );

      if (!rawContext) {
        return user;
      }

      const context = JSON.parse(rawContext) as {
        schoolId?: unknown;
        schoolName?: unknown;
      };

      if (
        typeof context.schoolId !== 'number' ||
        !Number.isSafeInteger(context.schoolId) ||
        context.schoolId <= 0 ||
        typeof context.schoolName !== 'string' ||
        !context.schoolName.trim()
      ) {
        this.clearStoredManagedSchool();
        return user;
      }

      return {
        ...user,
        schoolId: context.schoolId,
        schoolName: context.schoolName.trim()
      };
    } catch {
      this.clearStoredManagedSchool();
      return user;
    }
  }

  private clearStoredManagedSchool(): void {
    try {
      sessionStorage.removeItem(
        this.managedSchoolStorageKey
      );
    } catch {
      // No se requiere persistencia para cerrar el contexto.
    }
  }

  private requestCsrfToken():
    Observable<CsrfTokenResponse> {
    return this.http.get<CsrfTokenResponse>(
      '/api/v1/auth/csrf'
    );
  }
}