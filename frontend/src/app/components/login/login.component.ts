import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../services/auth.service';

// Google Identity Services attaches a global `google` object once its script loads.
declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  @ViewChild('googleBtn') googleBtn?: ElementRef<HTMLDivElement>;

  submitting = signal(false);
  errorMsg = signal<string | null>(null);
  googleEnabled = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngAfterViewInit(): void {
    // Ask the server whether Google sign-in is configured and for the client id.
    this.http.get<{ googleAuthEnabled: boolean; googleClientId: string | null }>('/api/meta').subscribe({
      next: (meta) => {
        if (meta.googleAuthEnabled && meta.googleClientId) {
          this.googleEnabled.set(true);
          this.initGoogle(meta.googleClientId);
        }
      },
      error: () => {},
    });
  }

  private async initGoogle(clientId: string): Promise<void> {
    await this.loadGisScript();
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp: { credential: string }) => this.onGoogleCredential(resp.credential),
    });
    // renderButton needs the target element to exist in the DOM.
    if (this.googleBtn) {
      google.accounts.id.renderButton(this.googleBtn.nativeElement, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signin_with',
      });
    }
  }

  private loadGisScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google?.accounts?.id) return resolve();
      const existing = document.getElementById('google-gsi');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.id = 'google-gsi';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  private onGoogleCredential(credential: string): void {
    // The GIS callback runs outside Angular's zone, so re-enter it for routing/CD.
    this.zone.run(() => {
      this.errorMsg.set(null);
      this.auth.googleLogin(credential).subscribe({
        next: () => this.router.navigateByUrl('/'),
        error: (err: HttpErrorResponse) =>
          this.errorMsg.set(
            err.status === 403
              ? 'This Google account is not authorized. Ask the principal to add your email first.'
              : 'Google sign-in failed. Please try again.',
          ),
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMsg.set(
          err.status === 401 ? 'Invalid email or password' : 'Something went wrong. Please try again.',
        );
      },
    });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.touched && c.invalid;
  }
}
