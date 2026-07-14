import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { CreateUserPayload, StaffUser } from '../../models/user';

@Component({
  selector: 'app-manage-admins',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    TagModule,
    ConfirmDialogModule,
  ],
  templateUrl: './manage-admins.component.html',
  styleUrl: './manage-admins.component.scss',
})
export class ManageAdminsComponent implements OnInit {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private messages = inject(MessageService);
  private confirm = inject(ConfirmationService);
  auth = inject(AuthService);

  users = signal<StaffUser[]>([]);
  loading = signal(false);
  dialogVisible = false;
  submitting = signal(false);
  serverErrors: Record<string, string> = {};

  readonly roleOptions = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Principal', value: 'PRINCIPAL' },
  ];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['ADMIN', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.userService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Failed to load staff accounts' });
      },
    });
  }

  openCreate(): void {
    this.serverErrors = {};
    this.form.reset({ name: '', email: '', password: '', role: 'ADMIN' });
    this.dialogVisible = true;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.serverErrors = {};

    this.userService.create(this.form.getRawValue() as CreateUserPayload).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.dialogVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Staff account created',
          detail: `${user.email} (${user.role})`,
        });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (err.status === 422 && err.error?.errors) {
          this.serverErrors = { ...err.error.errors };
        } else if (err.status === 409) {
          this.serverErrors = { email: 'A user with this email already exists' };
        } else {
          this.messages.add({
            severity: 'error',
            summary: 'Could not create account',
            detail: err.error?.message ?? 'Please try again.',
          });
        }
      },
    });
  }

  toggleActive(user: StaffUser): void {
    const activate = !user.isActive;
    const apply = () =>
      this.userService.setActive(user.id, activate).subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: activate ? 'Account activated' : 'Account deactivated',
            detail: user.email,
          });
          this.load();
        },
        error: (err: HttpErrorResponse) =>
          this.messages.add({
            severity: 'error',
            summary: 'Action failed',
            detail: err.error?.message ?? 'Please try again.',
          }),
      });

    if (activate) {
      apply();
      return;
    }
    this.confirm.confirm({
      header: 'Deactivate account',
      message: `Deactivate ${user.email}? They will be signed out and unable to log in.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: apply,
    });
  }

  isSelf(user: StaffUser): boolean {
    return this.auth.user()?.id === user.id;
  }

  error(name: string): string | null {
    if (this.serverErrors[name]) return this.serverErrors[name];
    const c = this.form.get(name);
    if (!c || !(c.touched || c.dirty) || !c.errors) return null;
    const e = c.errors;
    if (e['required']) return 'This field is required';
    if (e['minlength']) return `Must be at least ${e['minlength'].requiredLength} characters`;
    if (e['email']) return 'Enter a valid email address';
    return 'Invalid value';
  }
}
