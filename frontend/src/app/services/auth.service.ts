import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthUser } from '../models/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // The current user is held in a signal so any component can react to it.
  private userSig = signal<AuthUser | null>(null);
  private loaded = false; // whether we've asked the server "who am I?" at least once

  readonly user = this.userSig.asReadonly();
  readonly isPrincipal = computed(() => this.userSig()?.role === 'PRINCIPAL');

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>('/api/auth/login', { email, password })
      .pipe(tap((u) => this.set(u)));
  }

  logout(): Observable<unknown> {
    return this.http.post('/api/auth/logout', {}).pipe(tap(() => this.set(null)));
  }

  // Used by the route guard on page load. Because the cookie is httpOnly, the
  // only way to know if we're logged in is to ask the server.
  ensureLoaded(): Observable<AuthUser | null> {
    if (this.loaded) return of(this.userSig());
    return this.http.get<AuthUser>('/api/auth/me').pipe(
      tap((u) => this.set(u)),
      catchError(() => {
        this.set(null);
        return of(null);
      }),
    );
  }

  clear(): void {
    this.set(null);
  }

  private set(user: AuthUser | null): void {
    this.userSig.set(user);
    this.loaded = true;
  }
}
